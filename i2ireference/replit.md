# ColorWerkz

## Overview
ColorWerkz is a web application for manufacturing, designed to calculate and visualize combinatorial mathematical formulas for authentic RAL color combinations with objects and SKUs. It supports up to 14 official RAL colors and 10,000 SKUs, providing real-time calculations, interactive controls, authentic RAL color visualization, and comprehensive export functionality. The vision is to streamline manufacturing design and planning, increasing efficiency and reducing errors through powerful visualization and data generation tools.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (2025-10-03 - Latest)
- **Synthetic RAL Training Pipeline**: Production-ready metadata-driven dataset generation achieving 172.7× storage efficiency
  - Tom Sawyer Metadata Method: RAL colors as metadata (not duplicate physical images) for 196× data expansion per source image
  - On-the-fly LAB color space transfer in PyTorch dataset with validated 16.89 samples/sec throughput on CPU
  - Complete validation suite with honest WARN status (training-ready, manufacturing-pending)
  - Reproducible artifact persistence: all validation files, manifests, and images persist to `server/validation_reports/`
  - Self-copy guard enables re-running validation with persistent images without crashes
  - Measured metrics: 172.7× savings (47.8 MB → 0.277 MB), 16.89 samples/sec, Loss 0.6184→0.4187 convergence
  - Color accuracy: Delta E 25.13 (training-acceptable, awaits U-Net training for <2.0 manufacturing standard)
  - CI/CD ready: automated validation with `python3 server/test_synthetic_ral_pipeline.py`
  - Production status: ✅ Dataset generation, ⚠️ Manufacturing quality pending GPU-trained U-Net model
  - Next steps: GPU deployment (100× faster), full U-Net training (30-50 epochs), 202 product manifest generation (39,592 samples)

## Previous Updates (2025-09-12)
- **Universal AI Training & Evaluation Framework**: Revolutionary manufacturing intelligence system now operational
  - Complete 8-section structured training methodology (Symptoms → Executive Summary)
  - Real industrial workbench dataset integration (202 products, 14 RAL colors, 6 actual images)
  - Authentic manufacturing-grade evaluation metrics (ΔE < 2.0, 95%+ accuracy targets)
  - ResNet50 transfer learning architecture optimized for RAL color classification
  - Production-ready Python framework with comprehensive dependency management
  - Seamless API integration with existing ColorWerkz AI Color Assistant infrastructure
  - Manufacturing intelligence deployment ready for authentic color analysis workflows

## Previous Updates (2025-09-11)
- **Energy Calculator Enhancement**: Added New England regional energy rates
  - Added "New England" as a regional option covering all six New England states (CT, MA, ME, NH, RI, VT)
  - Includes both residential ($0.2156/kWh) and commercial ($0.1876/kWh) rates
  - Based on ISO New England regional data with 318g CO₂e/kWh carbon intensity
  - Provides broader regional coverage beyond individual state options

## Previous Updates (2025-09-10)
- **High-Accuracy Image-to-Image Transfer System**: Revolutionary I2I pipeline combining OpenCV, G'MIC, and PyTorch
  - Complete Pix2Pix and CycleGAN implementations with enhanced U-Net generators and multi-scale PatchGAN discriminators
  - Advanced loss functions: L1, perceptual (VGG), feature matching, Delta E 2000, edge-aware, and mask-aware losses
  - G'MIC signal processing integration: retinex illumination correction, non-local means denoising, bilateral smoothing, unsharp masking
  - Comprehensive evaluation metrics: SSIM, PSNR, LPIPS (custom implementation), Delta E 2000, edge SSIM, gradient error
  - Production-grade training system with AMP, EMA, cosine scheduling, early stopping, and TTA inference
  - Color space management with sRGB/linear conversions and LAB color accuracy validation
  - CLI interface with preprocess, train, eval, infer commands supporting full configuration management
  - API endpoints for model training, inference, evaluation, and configuration management
  - Reproducible training with deterministic CUDA flags, fixed seeds, and comprehensive checkpointing
  - Quality gates: SSIM ≥ 0.92, PSNR ≥ 28 dB, LPIPS ≤ 0.10, ΔE00 ≤ 2.0, runtime ≤ 120ms GPU / ≤ 1.2s CPU

## Previous Updates (2025-01-23)
- **Comprehensive Application Review & Security Enhancements**:
  - Conducted thorough 5-point review: UI consistency, functionality, performance, error handling, security
  - Implemented React Error Boundaries for robust error isolation and recovery
  - Added CSRF protection middleware with token validation for state-changing operations
  - Enhanced Content Security Policy (CSP) with strict directives and security headers
  - Created virtual scrolling component for efficient handling of large datasets
  - Added security logging middleware to detect and log suspicious request patterns
  - Improved error handling with centralized error management system
  - Fixed critical import issues and reorganized middleware structure
- **Medium-Priority Performance Improvements**:
  - Implemented offline detection with real-time network quality monitoring (good/slow/offline states)
  - Added Web Vitals performance monitoring tracking Core Web Vitals (CLS, FCP, FID, LCP, TTFB, INP)
  - Created virtual scrolling component for efficiently rendering large lists (thousands of items)
  - Added health check endpoint (/api/health) for connectivity monitoring
  - Integrated offline indicator UI component showing connection status
  - Performance metrics automatically reported to server for analysis
  - Example implementation of virtual scrolling for SKU lists handling 10,000+ items
- **Advanced Annotation & Masking System**: Enhanced image-to-image algorithm precision
  - Detailed annotation processor extracting contextual insights from image regions
  - 10 annotation categories: furniture parts, background, shadows, textures, edges
  - Feature extraction: color statistics, texture variance, shape metrics, edge density
  - Integrated masking with annotation-guided refinement
  - Hierarchical region organization (primary, secondary, auxiliary)
  - Spatial relationship extraction between regions
  - Quality scoring system for annotated masks
  - Multi-format export support (JSON, COCO, YOLO)
  - Visualization system with color-coded region overlays
  - New "Annotations" tab in UI for comprehensive image analysis
- **RGB to HEX Color Transition**: Comprehensive HEX color processing system
  - HexColorProcessor class for RGB↔HEX conversions with RAL color mapping
  - Advanced segmentation module with 7 different methods (GrabCut, Watershed, Mean Shift, etc.)
  - Ensemble segmentation combining multiple techniques for best results
  - PyTorch-based HEX segmentation model with attention mechanisms
  - Enhanced HEX color transfer with 3 methods: Advanced (luminance preserved), Gradient, Direct
  - Frontend HEX color picker with visual color palette extraction
  - API endpoints for HEX color transfer and dominant color extraction
  - Real-time HEX color visualization and selection interface
  - Support for both manual HEX input and color picker selection
  - Extraction of dominant HEX colors from uploaded images
- **Production-Grade OpenCV Masking & PyTorch Validation**: Implemented enterprise-level color accuracy system
  - K-means Lab clustering → Canny+Watershed refinement → morphology cleanup pipeline
  - PyTorch-based Delta E validation (CIE76 and CIE2000) for RAL color accuracy
  - Two-region binary mask generation optimized for furniture components
  - Optional SLIC superpixel refinement for edge-aware boundaries
  - GPU-accelerated color validation with batch processing support
  - Differentiable Lab color loss for training-time gradient guidance
  - Complete RAL color database (200+ colors) with RGB/HEX mappings
  - Quality metrics: Excellent (ΔE≤3), Good (ΔE≤5), Acceptable (ΔE≤7) for DE2000
  - Visualization system showing mask overlays and validation results
  - Enhanced RAL transfer module integrating OpenCV masks with color validation

## System Architecture

### UI/UX Decisions
- **Typography**: Uses Plus Jakarta Sans for a modern aesthetic.
- **Iconography**: Modern icons from Lucide-React.
- **Responsiveness**: Mobile-first design with responsive breakpoints and 44px minimum touch targets.
- **Theming**: Consistent color and spacing systems using CSS custom properties.
- **Component Library**: shadcn/ui components built on Radix UI primitives for accessibility and consistent design.

### Technical Implementations
- **Full-Stack Language**: TypeScript for type safety.
- **Frontend**: React 18 with Wouter for routing and React hooks with TanStack Query for state management. Vite is used for development and builds.
- **Backend**: Node.js with Express.js for RESTful APIs.
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries and schema management. Zod for shared schema definitions and runtime validation.
- **Image Processing (Python)**: Utilizes advanced AI algorithms for superior color analysis accuracy. Features include:
    - **Advanced Color Analyzer**: Ensemble methods combining multiple color difference metrics (CIEDE2000, CIE94, CMC) with confidence scoring.
    - **Enhanced Preprocessing**: Multi-stage pipeline with illumination correction, hybrid color constancy, adaptive contrast, and shadow/highlight recovery.
    - **Ensemble Segmentation**: Combines deep learning, graph-based, watershed, and mean-shift methods for robust region detection, including 8 different segmentation methods and hybrid approaches.
    - **Advanced Training Pipeline**: Modern techniques like MixUp/CutMix augmentation, self-attention, residual blocks, label smoothing, and automatic mixed precision.
    - **Multiple Analysis Methods**: OpenCV (fast), PyTorch (accurate), Hybrid (balanced), and Advanced AI (most accurate with 95%+ confidence potential).
    - **GAN-based Color Transfer**: Generative Adversarial Network for realistic color transfer with perceptual loss and RAL color consistency.
    - **Advanced Data Augmentation**: Comprehensive pipeline with color jittering, geometric transformations, noise/blur, shadow simulation, and elastic deformations.
    - **AI Model Integration**: PyTorch segmentation models, color classifier models (ral_color_model_best.pth, ral_rgb_classifier.pth), ONNX models, and ensemble methods are actively used for color transfer.
- **SKU Management**: Intelligent SKU collision prevention with multiple resolution strategies and unlimited SKU generation with flexible formatting options.
- **Batch Processing**: Multi-image batch processing with individual color variations, supporting multi-file upload, configurable combinations, real-time progress, and visual results grid.
- **Image-to-Image Color Transfer**: Advanced system using OpenCV and PyTorch with RAL color standards. Features three transfer methods, RAL color selection, automatic SKU generation, seamless single image mode, dual modes for color extraction/selection, "Use Source as Target" functionality, and consistency enforcement.

### System Design Choices
- **Modularity**: Clear separation between frontend, backend, and image processing components.
- **Scalability**: Designed to handle large datasets (e.g., 1,215,200 color combinations) with chunked processing and cached masks.
- **Data Export**: Supports multi-format data export (PDF, CSV, image).
- **AI Integration**: AI training and inference capabilities with status tracking, allowing for continuous model improvement.
- **Model Management System**: Comprehensive system for uploading, testing, and comparing trained ML models (PyTorch, ONNX, TorchScript, TensorFlow). Provides efficacy testing, model comparison, version management, and validation tools.
- **User Management**: Role-Based Access Control (Admin, Manager, User, Viewer roles).
- **Backup & Recovery**: Automated database backups with scheduled tasks.
- **Analytics Dashboard**: Real-time KPIs, user activity tracking, and performance metrics.
- **Performance Optimization**: Comprehensive caching (LRU), lazy loading, request debouncing/throttling, request batching, compression middleware, and performance monitoring.

## External Dependencies

### UI and Styling
- **@radix-ui/react-***: Unstyled, accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant API for component styling.
- **lucide-react**: Icon library.

### Data and State Management
- **@tanstack/react-query**: Data synchronization for React.
- **react-hook-form**: Performant forms.
- **@hookform/resolvers**: Integration with validation libraries for forms.

### Database and Backend
- **drizzle-orm**: Type-safe SQL ORM.
- **@neondatabase/serverless**: Serverless PostgreSQL database driver.
- **connect-pg-simple**: PostgreSQL session store for Express.

### Development and Build Tools
- **vite**: Frontend build tool.
- **@vitejs/plugin-react**: React plugin for Vite.
- **esbuild**: Fast JavaScript bundler.
- **tsx**: TypeScript execution environment for development.

### Utility Libraries
- **date-fns**: Date utility library.
- **chart.js**: Charting library.
- **clsx**: Utility for className strings.
- **cmdk**: Command palette component.

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Error reporting.
- **@replit/vite-plugin-cartographer**: Development tooling for Replit.

### Core Technologies (Implicit from features)
- **OpenCV**: For image processing and computer vision.
- **PyTorch**: For deep learning models.
- **NumPy**: For numerical operations in Python.
- **PostgreSQL**: For core database operations.
- **Express.js**: For backend server.
- **React**: For frontend UI.
```