// Package.swift — COMET visionOS App
// Creative Liberation Engine v5 | Phase G: Sovereign Spatial Browser
// Requires: Xcode 15.2+, visionOS 1.2+

// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CometVision",
    platforms: [.visionOS(.v1)],
    products: [
        .library(name: "CometVision", targets: ["CometVision"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "CometVision",
            dependencies: [],
            path: "Sources/CometVision"
        ),
    ]
)
