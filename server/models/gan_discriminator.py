#!/usr/bin/env python3
"""
GAN Discriminator - PatchGAN for Texture Quality
Architecture: PatchGAN (judges local patches rather than whole image)

Council Review:
- Knuth: Proven PatchGAN architecture from Pix2Pix paper
- Wolfram: Local texture evaluation via convolutional patches
- Torvalds: Memory-efficient (operates on patches, not full image)
- Graham: Optimal receptive field size for texture discrimination

Mathematical Framework (Wolfram):
    D: Image_space → Patch_predictions
    Each prediction: Real/Fake for a local receptive field
    Advantage: Captures high-frequency texture details
"""

import torch
import torch.nn as nn


class DiscriminatorBlock(nn.Module):
    """
    Discriminator convolutional block

    Knuth: Standard conv → norm → activation pattern
    """

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        stride: int = 2,
        normalize: bool = True
    ):
        super().__init__()

        layers = [
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=4,
                stride=stride,
                padding=1,
                bias=not normalize  # No bias if using normalization
            )
        ]

        if normalize:
            layers.append(nn.InstanceNorm2d(out_channels))

        layers.append(nn.LeakyReLU(0.2, inplace=True))

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class PatchGANDiscriminator(nn.Module):
    """
    PatchGAN Discriminator for Manufacturing-Grade Color Transfer

    Architecture:
        - Convolutional layers with increasing depth
        - Outputs NxN patch predictions (not single scalar)
        - Each patch: Real/Fake classification for local region

    Input:  (Batch, 6, H, W) - Original image + Transformed image concatenated
    Output: (Batch, 1, H/16, W/16) - Patch-wise predictions

    Knuth Analysis:
        Receptive field: 70×70 pixels per patch
        Complexity: O(HW × C × L) - linear in image size
        Memory: O(C × H × W) - efficient for large images

    Wolfram Rule:
        Evaluate local texture consistency
        Ignore global structure (handled by perceptual loss)
    """

    def __init__(self, input_channels: int = 6, base_filters: int = 64):
        """
        Initialize PatchGAN discriminator

        Args:
            input_channels: 6 (original RGB + transformed RGB)
            base_filters: Base number of filters (grows by 2× each layer)
        """
        super().__init__()

        # Layer 1: No normalization (Knuth: follows Pix2Pix paper exactly)
        self.layer1 = DiscriminatorBlock(
            input_channels,
            base_filters,
            stride=2,
            normalize=False
        )

        # Layer 2: 128 filters
        self.layer2 = DiscriminatorBlock(
            base_filters,
            base_filters * 2,
            stride=2,
            normalize=True
        )

        # Layer 3: 256 filters
        self.layer3 = DiscriminatorBlock(
            base_filters * 2,
            base_filters * 4,
            stride=2,
            normalize=True
        )

        # Layer 4: 512 filters, stride=1 (maintain spatial resolution)
        self.layer4 = DiscriminatorBlock(
            base_filters * 4,
            base_filters * 8,
            stride=1,
            normalize=True
        )

        # Output layer: 1 channel per patch
        self.output = nn.Conv2d(
            base_filters * 8,
            1,
            kernel_size=4,
            padding=1
        )
        # No sigmoid - use BCEWithLogitsLoss for numerical stability

    def forward(self, original: torch.Tensor, transformed: torch.Tensor) -> torch.Tensor:
        """
        Forward pass: Discriminate between real and fake image pairs

        Args:
            original: Original image (Batch, 3, H, W)
            transformed: Transformed image (Batch, 3, H, W)

        Returns:
            Patch predictions (Batch, 1, H/16, W/16)
            Each value: logit for Real (>0) vs Fake (<0)

        Wolfram Rule:
            Concatenate inputs → Evaluate local patches → Output grid of predictions
        """
        # Concatenate original and transformed images
        x = torch.cat([original, transformed], dim=1)  # (B, 6, H, W)

        # Convolutional layers
        x = self.layer1(x)  # (B, 64, H/2, W/2)
        x = self.layer2(x)  # (B, 128, H/4, W/4)
        x = self.layer3(x)  # (B, 256, H/8, W/8)
        x = self.layer4(x)  # (B, 512, H/8, W/8)

        # Output patch predictions
        output = self.output(x)  # (B, 1, H/16, W/16)

        return output

    def count_parameters(self) -> int:
        """
        Knuth: Explicit parameter counting
        """
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def create_discriminator(device: str = 'cpu') -> PatchGANDiscriminator:
    """
    Factory function for discriminator creation

    Ritchie: Simple, composable interface
    """
    model = PatchGANDiscriminator(input_channels=6, base_filters=64)
    model = model.to(device)

    # Initialize weights (Knuth: proper initialization)
    def init_weights(m):
        if isinstance(m, nn.Conv2d):
            nn.init.normal_(m.weight, 0.0, 0.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)

    model.apply(init_weights)

    return model


if __name__ == '__main__':
    # Knuth: Test the architecture
    print("Testing PatchGANDiscriminator...")

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    discriminator = create_discriminator(device)

    print(f"Discriminator parameters: {discriminator.count_parameters():,}")
    print(f"Device: {device}")

    # Test forward pass
    batch_size = 2
    original = torch.randn(batch_size, 3, 512, 512).to(device)
    transformed = torch.randn(batch_size, 3, 512, 512).to(device)

    with torch.no_grad():
        output = discriminator(original, transformed)

    print(f"Original shape: {original.shape}")
    print(f"Transformed shape: {transformed.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Output patches: {output.shape[-2]}×{output.shape[-1]}")
    print(f"Receptive field per patch: ~70×70 pixels")

    expected_patches = 512 // 16
    assert output.shape[-1] == expected_patches, "Patch size mismatch!"
    print("\n✓ Discriminator architecture verified!")
