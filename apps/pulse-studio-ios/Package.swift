// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PulseStudioiOS",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
        .visionOS(.v2)
    ],
    products: [
        .library(name: "PulseStudio", targets: ["PulseStudio"])
    ],
    dependencies: [
        .package(url: "https://github.com/ml-explore/mlx-swift.git", branch: "main"),
        .package(url: "https://github.com/huggingface/swift-transformers.git", from: "0.1.0")
    ],
    targets: [
        .target(
            name: "PulseStudio",
            dependencies: [
                .product(name: "MLX", package: "mlx-swift"),
                .product(name: "MLXRandom", package: "mlx-swift"),
                .product(name: "MLXNN", package: "mlx-swift"),
                .product(name: "MLXOptimizers", package: "mlx-swift"),
                .product(name: "Transformers", package: "swift-transformers")
            ]
        )
    ]
)
