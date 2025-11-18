#!/usr/bin/env python3
"""
GAN Generator - ResNet-based Color Transfer
Architecture: Pix2Pix Generator with Residual Blocks

Council Review:
- Knuth: Explicit architecture with proven ResNet blocks
- Wolfram: Transformation mapping f: (Structure, Color_target) → Image_output
- Torvalds: Efficient tensor operations, minimal memory overhead
- Ritchie: Composable blocks, modular design

Mathematical Framework (Wolfram):
    G: Structure_space × Color_space → Image_space
    Invariant: Topology (edges) preserved via skip connections
    Transform: L-channel conditional, a,b channels generated
"""

import torch
import torch.nn as nn


class ResidualBlock(nn.Module):
    """
    Residual Block with skip connection

    Knuth invariant: Output = Input + F(Input)
    This ensures gradient flow and prevents vanishing gradients
    """

    def __init__(self, channels: int):
        super().__init__()

        self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.norm1 = nn.InstanceNorm2d(channels)
        self.relu = nn.ReLU(inplace=True)

        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.norm2 = nn.InstanceNorm2d(channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Residual forward pass

        Invariant: output.shape == x.shape
        """
        identity = x

        out = self.conv1(x)
        out = self.norm1(out)
        out = self.relu(out)

        out = self.conv2(out)
        out = self.norm2(out)

        # Skip connection (Knuth: preserve input information)
        out = out + identity
        out = self.relu(out)

        return out


class DownsampleBlock(nn.Module):
    """
    Encoder block: Downsample with convolution

    Wolfram: Compress spatial dimensions while expanding feature space
    """

    def __init__(self, in_channels: int, out_channels: int, normalize: bool = True):
        super().__init__()

        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=4, stride=2, padding=1)
        ]

        if normalize:
            layers.append(nn.InstanceNorm2d(out_channels))

        layers.append(nn.LeakyReLU(0.2, inplace=True))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class UpsampleBlock(nn.Module):
    """
    Decoder block: Upsample with transposed convolution

    Wolfram: Expand spatial dimensions while compressing feature space
    """

    def __init__(self, in_channels: int, out_channels: int, dropout: float = 0.0):
        super().__init__()

        layers = [
            nn.ConvTranspose2d(in_channels, out_channels, kernel_size=4, stride=2, padding=1)
        ]

        layers.append(nn.InstanceNorm2d(out_channels))

        if dropout > 0:
            layers.append(nn.Dropout(dropout))

        layers.append(nn.ReLU(inplace=True))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class ColorTransferGenerator(nn.Module):
    """
    Pix2Pix-style Generator for Manufacturing-Grade Color Transfer

    Architecture:
        - Encoder: Downsample from 512×512 to 1×1 feature maps
        - Bottleneck: ResNet blocks for topology preservation
        - Decoder: Upsample back to 512×512
        - Skip connections: U-Net style (preserve structural details)

    Input:  (Batch, 6, H, W) - RGB image + target LAB colors (broadcasted)
    Output: (Batch, 3, H, W) - Transformed RGB image

    Knuth Complexity: O(HW × Channels × Layers) - linear in image size
    Wolfram Rule: Preserve edges, transform colors, maintain structure
    """

    def __init__(
        self,
        input_channels: int = 6,  # 3 (RGB) + 3 (target LAB colors)
        output_channels: int = 3,  # RGB output
        base_filters: int = 64,
        num_residual_blocks: int = 9
    ):
        super().__init__()

        # Encoder (downsample)
        self.down1 = DownsampleBlock(input_channels, base_filters, normalize=False)
        self.down2 = DownsampleBlock(base_filters, base_filters * 2)
        self.down3 = DownsampleBlock(base_filters * 2, base_filters * 4)
        self.down4 = DownsampleBlock(base_filters * 4, base_filters * 8)

        # Bottleneck (ResNet blocks - Knuth: proven architecture)
        residual_blocks = []
        for _ in range(num_residual_blocks):
            residual_blocks.append(ResidualBlock(base_filters * 8))
        self.residual_blocks = nn.Sequential(*residual_blocks)

        # Decoder (upsample with skip connections)
        self.up1 = UpsampleBlock(base_filters * 8, base_filters * 4)
        self.up2 = UpsampleBlock(base_filters * 4 * 2, base_filters * 2)  # *2 for skip
        self.up3 = UpsampleBlock(base_filters * 2 * 2, base_filters)
        self.up4 = UpsampleBlock(base_filters * 2, base_filters)

        # Output layer
        self.output = nn.Sequential(
            nn.Conv2d(base_filters, output_channels, kernel_size=7, padding=3),
            nn.Tanh()  # Output range [-1, 1]
        )

    def forward(self, x: torch.Tensor, target_colors: torch.Tensor) -> torch.Tensor:
        """
        Forward pass with U-Net skip connections

        Args:
            x: Input image (Batch, 3, H, W)
            target_colors: Target LAB colors (Batch, 3) - will be broadcasted

        Returns:
            Transformed image (Batch, 3, H, W)

        Wolfram Rule:
            1. Encode structure (downsample)
            2. Transform in bottleneck (ResNet)
            3. Decode with structure preservation (skip connections)
        """
        # Broadcast target colors to spatial dimensions
        batch, _, h, w = x.shape
        target_map = target_colors.view(batch, 3, 1, 1).expand(batch, 3, h, w)

        # Concatenate input image with target color map
        x_input = torch.cat([x, target_map], dim=1)  # (B, 6, H, W)

        # Encoder
        d1 = self.down1(x_input)  # (B, 64, H/2, W/2)
        d2 = self.down2(d1)       # (B, 128, H/4, W/4)
        d3 = self.down3(d2)       # (B, 256, H/8, W/8)
        d4 = self.down4(d3)       # (B, 512, H/16, W/16)

        # Bottleneck (topology preservation via ResNet)
        bottleneck = self.residual_blocks(d4)

        # Decoder with skip connections (U-Net style)
        u1 = self.up1(bottleneck)
        u1 = torch.cat([u1, d3], dim=1)  # Skip connection

        u2 = self.up2(u1)
        u2 = torch.cat([u2, d2], dim=1)

        u3 = self.up3(u2)
        u3 = torch.cat([u3, d1], dim=1)

        u4 = self.up4(u3)

        # Output
        output = self.output(u4)

        return output

    def count_parameters(self) -> int:
        """
        Knuth: Explicit parameter counting for complexity analysis
        """
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def create_generator(device: str = 'cpu') -> ColorTransferGenerator:
    """
    Factory function for generator creation

    Ritchie: Simple, composable interface
    """
    model = ColorTransferGenerator(
        input_channels=6,
        output_channels=3,
        base_filters=64,
        num_residual_blocks=9
    )

    model = model.to(device)

    # Initialize weights (Knuth: proper initialization prevents training issues)
    def init_weights(m):
        if isinstance(m, (nn.Conv2d, nn.ConvTranspose2d)):
            nn.init.normal_(m.weight, 0.0, 0.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)

    model.apply(init_weights)

    return model


if __name__ == '__main__':
    # Knuth: Test the architecture with sample input
    print("Testing ColorTransferGenerator...")

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    generator = create_generator(device)

    print(f"Generator parameters: {generator.count_parameters():,}")
    print(f"Device: {device}")

    # Test forward pass
    batch_size = 2
    x = torch.randn(batch_size, 3, 512, 512).to(device)
    target_colors = torch.randn(batch_size, 3).to(device)

    with torch.no_grad():
        output = generator(x, target_colors)

    print(f"Input shape: {x.shape}")
    print(f"Target colors shape: {target_colors.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Output range: [{output.min():.3f}, {output.max():.3f}]")

    assert output.shape == x.shape, "Output shape mismatch!"
    print("\n✓ Generator architecture verified!")
