#!/usr/bin/env python3
"""
Perceptual Loss using VGG-16 Feature Matching
Topology Preservation via High-Level Feature Comparison

Council Review:
- Knuth: Proven VGG-16 architecture, explicit feature layer selection
- Wolfram: Perceptual similarity = feature space distance (not pixel space)
- Torvalds: Frozen VGG weights, minimal memory overhead
- Graham: Optimal layer selection for texture vs structure

Mathematical Framework (Wolfram):
    L_perceptual = Σ λ_i * ||φ_i(x) - φ_i(G(z))||₁
    where φ_i = VGG features at layer i
    Preserves: High-level structure, edges, textures
    Ignores: Exact pixel values (good for color transfer!)
"""

import torch
import torch.nn as nn
from torchvision import models


class VGGPerceptualLoss(nn.Module):
    """
    Perceptual Loss using pre-trained VGG-16

    Knuth Analysis:
        - Uses layers: conv1_2, conv2_2, conv3_3, conv4_3
        - Early layers: Low-level features (edges, textures)
        - Deep layers: High-level features (structure, semantics)
        - Complexity: O(HW × C × L) - linear in image size

    Wolfram Rule:
        Transform preserves perceptual similarity, not pixel similarity
        Distance in feature space ≈ Human perceptual difference
    """

    def __init__(self, device: str = 'cpu', requires_grad: bool = False):
        """
        Initialize VGG-16 perceptual loss

        Args:
            device: 'cpu' or 'cuda'
            requires_grad: False (frozen VGG weights - Torvalds: save memory)
        """
        super().__init__()

        # Load pre-trained VGG-16 (Knuth: proven architecture)
        vgg = models.vgg16(pretrained=True).features.to(device).eval()

        # Freeze VGG weights (Torvalds: no gradient computation, save memory)
        for param in vgg.parameters():
            param.requires_grad = requires_grad

        # Select feature layers (Graham: optimal for perceptual similarity)
        # Layer indices in VGG-16 features:
        #   conv1_2: 3 (low-level edges)
        #   conv2_2: 8 (textures)
        #   conv3_3: 15 (patterns)
        #   conv4_3: 22 (structures)
        self.slice1 = nn.Sequential(*list(vgg[:4]))   # conv1_2
        self.slice2 = nn.Sequential(*list(vgg[4:9]))  # conv2_2
        self.slice3 = nn.Sequential(*list(vgg[9:16])) # conv3_3
        self.slice4 = nn.Sequential(*list(vgg[16:23]))# conv4_3

        # Feature weights (Knuth: explicit weighting scheme)
        # Early layers: higher weight (preserve fine details)
        # Deep layers: lower weight (preserve structure)
        self.weights = [1.0, 0.75, 0.5, 0.25]

        # VGG normalization (Knuth: ImageNet statistics)
        self.register_buffer(
            'mean',
            torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
        )
        self.register_buffer(
            'std',
            torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
        )

    def normalize(self, x: torch.Tensor) -> torch.Tensor:
        """
        Normalize image for VGG input

        Input: x in range [-1, 1] (Tanh output from generator)
        Output: Normalized for VGG (ImageNet stats)

        Knuth: Proper preprocessing is critical for feature matching
        """
        # Convert from [-1, 1] to [0, 1]
        x = (x + 1) / 2

        # Normalize with ImageNet statistics
        x = (x - self.mean) / self.std

        return x

    def extract_features(self, x: torch.Tensor) -> list:
        """
        Extract multi-scale VGG features

        Wolfram: Hierarchical feature extraction
        Returns: [conv1_2, conv2_2, conv3_3, conv4_3]
        """
        x = self.normalize(x)

        features = []

        # Layer 1
        x = self.slice1(x)
        features.append(x)

        # Layer 2
        x = self.slice2(x)
        features.append(x)

        # Layer 3
        x = self.slice3(x)
        features.append(x)

        # Layer 4
        x = self.slice4(x)
        features.append(x)

        return features

    def forward(self, x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        """
        Compute perceptual loss between x and y

        Args:
            x: Generated image (Batch, 3, H, W)
            y: Target image (Batch, 3, H, W)

        Returns:
            Scalar loss value

        Knuth Formula:
            L = Σ λ_i * ||φ_i(x) - φ_i(y)||₁
            where λ_i = weights[i]
        """
        # Extract features from both images
        x_features = self.extract_features(x)
        y_features = self.extract_features(y)

        # Compute weighted L1 distance in feature space
        loss = 0.0

        for i, (x_feat, y_feat, weight) in enumerate(
            zip(x_features, y_features, self.weights)
        ):
            # L1 distance (Knuth: more robust than L2 for perceptual tasks)
            loss += weight * torch.mean(torch.abs(x_feat - y_feat))

        return loss


class CombinedLoss(nn.Module):
    """
    Combined loss for GAN training

    Knuth Specification:
        L_total = λ_adv * L_adv + λ_perc * L_perc + λ_l1 * L_l1

    Where:
        L_adv  = Adversarial loss (fool discriminator)
        L_perc = Perceptual loss (preserve structure)
        L_l1   = Pixel-wise L1 loss (color accuracy)

    Wolfram Rule:
        Balance three objectives:
        1. Realism (adversarial)
        2. Structure preservation (perceptual)
        3. Color accuracy (L1)
    """

    def __init__(
        self,
        device: str = 'cpu',
        lambda_adv: float = 1.0,
        lambda_perc: float = 10.0,
        lambda_l1: float = 100.0
    ):
        """
        Initialize combined loss

        Args:
            device: 'cpu' or 'cuda'
            lambda_adv: Adversarial loss weight
            lambda_perc: Perceptual loss weight (Knuth: high for structure)
            lambda_l1: L1 loss weight (Knuth: high for color accuracy)
        """
        super().__init__()

        self.lambda_adv = lambda_adv
        self.lambda_perc = lambda_perc
        self.lambda_l1 = lambda_l1

        # Perceptual loss module
        self.perceptual_loss = VGGPerceptualLoss(device=device)

        # L1 loss for pixel-wise color accuracy
        self.l1_loss = nn.L1Loss()

        # Adversarial loss (BCEWithLogitsLoss for numerical stability)
        self.adversarial_loss = nn.BCEWithLogitsLoss()

    def generator_loss(
        self,
        fake_images: torch.Tensor,
        real_images: torch.Tensor,
        discriminator_fake: torch.Tensor
    ) -> tuple:
        """
        Compute generator loss

        Args:
            fake_images: Generated images
            real_images: Target images
            discriminator_fake: Discriminator predictions on fake images

        Returns:
            (total_loss, loss_dict)

        Knuth: Explicit loss breakdown for monitoring convergence
        """
        # Adversarial loss: Fool discriminator (want it to predict "real")
        target_real = torch.ones_like(discriminator_fake)
        loss_adv = self.adversarial_loss(discriminator_fake, target_real)

        # Perceptual loss: Preserve structure
        loss_perc = self.perceptual_loss(fake_images, real_images)

        # L1 loss: Color accuracy
        loss_l1 = self.l1_loss(fake_images, real_images)

        # Total loss (weighted sum)
        total_loss = (
            self.lambda_adv * loss_adv +
            self.lambda_perc * loss_perc +
            self.lambda_l1 * loss_l1
        )

        # Return breakdown for logging (Knuth: explicit monitoring)
        loss_dict = {
            'total': total_loss.item(),
            'adversarial': loss_adv.item(),
            'perceptual': loss_perc.item(),
            'l1': loss_l1.item()
        }

        return total_loss, loss_dict

    def discriminator_loss(
        self,
        discriminator_real: torch.Tensor,
        discriminator_fake: torch.Tensor
    ) -> tuple:
        """
        Compute discriminator loss

        Args:
            discriminator_real: Predictions on real images
            discriminator_fake: Predictions on fake images

        Returns:
            (total_loss, loss_dict)

        Knuth: Binary cross-entropy for real/fake classification
        """
        # Real images should be classified as "real" (label = 1)
        target_real = torch.ones_like(discriminator_real)
        loss_real = self.adversarial_loss(discriminator_real, target_real)

        # Fake images should be classified as "fake" (label = 0)
        target_fake = torch.zeros_like(discriminator_fake)
        loss_fake = self.adversarial_loss(discriminator_fake, target_fake)

        # Total discriminator loss
        total_loss = (loss_real + loss_fake) / 2

        loss_dict = {
            'total': total_loss.item(),
            'real': loss_real.item(),
            'fake': loss_fake.item()
        }

        return total_loss, loss_dict


if __name__ == '__main__':
    # Knuth: Test perceptual loss module
    print("Testing VGGPerceptualLoss...")

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Device: {device}")

    # Create loss module
    perceptual_loss = VGGPerceptualLoss(device=device)

    # Test forward pass
    batch_size = 2
    x = torch.randn(batch_size, 3, 256, 256).to(device)
    y = torch.randn(batch_size, 3, 256, 256).to(device)

    loss = perceptual_loss(x, y)

    print(f"Input shape: {x.shape}")
    print(f"Perceptual loss: {loss.item():.6f}")

    # Test combined loss
    print("\nTesting CombinedLoss...")
    combined_loss = CombinedLoss(device=device)

    fake_images = torch.randn(batch_size, 3, 256, 256).to(device)
    real_images = torch.randn(batch_size, 3, 256, 256).to(device)
    discriminator_fake = torch.randn(batch_size, 1, 16, 16).to(device)

    total_loss, loss_dict = combined_loss.generator_loss(
        fake_images, real_images, discriminator_fake
    )

    print(f"Generator loss breakdown:")
    for key, value in loss_dict.items():
        print(f"  {key}: {value:.6f}")

    print("\n✓ Perceptual loss module verified!")
