---
author: ["Utkarsh Sharma"]
title: "3D Reconstruction with 3DGS, NeRF, and Their Variants"
date: "2025-11-08"
description: "Exploring 3D scene reconstruction techniques using 3D Gaussian Splatting (3DGS), Neural Radiance Fields (NeRF), and their variants across different scenarios."
summary: "An in-depth look at modern 3D reconstruction methods such as 3DGS and NeRF, comparing their architectures, strengths, and performance in diverse applications."
tags: ["3D Reconstruction", "3DGS", "NeRF", "Computer Vision", "Deep Learning"]
categories: ["computer-vision", "3d-reconstruction", "deep-learning"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

<span style="color:red;font-weight:700;font-size:1.05em">
This post is a work in progress and may be updated or expanded soon!
</span>


# Basics
## Inverse Transform Sampling
## SfM
## MPI
## Stereo Magnification

# Radiance Fields
## NeRF

Uses a Neural Network to represent a continuous scene as a $5D$ vector-valued function whose input is a $3D$ location and a $2D$ viewing direction, and whose output is a volume density and emitted color.

$$
f\!\left(
\underbrace{x, y, z}_{\text{3D point}},\;
\underbrace{\theta, \phi}_{\text{viewing direction}}
\right)
\;\longrightarrow\;
\left(
\underbrace{\sigma}_{\text{opacity}},\;
\underbrace{\mathbf{c} = (r, g, b)}_{\text{RGB color}}
\right)
$$
 

- Sample some pixels from the image to train the model  
- Render using NeRF along the ray for that pixel; use an MLP to sample along the ray  
- Use a loss (e.g., MSE or PSNR) to compare the rendered output and backpropagate to train

### Positional Encoding

Despite the fact that neural networks are universal function approximators, having the network $F_\Theta$ directly operate on $xyz\theta\phi$ input coordinates results in renderings that perform poorly at representing high-frequency variation in color and geometry because deep networks are biased towards learning lower frequency functions.

Mapping the inputs to a higher dimensional space using high frequency functions before passing them to the network enables better fitting of data that contains high frequency variation.

$$\gamma : \mathbb{R}\rightarrow \mathbb{R}^{2L}$$

$$\gamma(p) = (\sin(2^0\pi p), \cos(2^0\pi p), \dots, \sin(2^{L - 1}\pi p), \cos(2^{L - 1}\pi p))$$

This function $\gamma(\cdot)$ is applied separately to each of the three coordinate values in $\mathbf{x}$ which are normalized to lie in $[-1, 1]$ and to the three components of the Cartesian viewing direction unit vector $\mathbf{d}$ (which by construction lie in $[-1, 1]$).

A similar mapping is used in the popular Transformer architecture, where it is referred to as a positional encoding.

### Hierarchical Sampling

To render using the NeRF we need to sample along the ray for the pixel. A ray is defined as:

$$\mathbf{r}(t) = \underbrace{\mathbf{o}}_{\text{origin}} + t\underbrace{\mathbf{d}}_{\text{direction}}$$


Divide the scene's $[z_{\text{near}}, z_{\text{far}}]$ into $n$ intervals of equal length. Uniformly sample at random within each interval:

$$
z_i \sim \mathbb{U} \left[
  z_n + \frac{(i - 1)(z_{\text{far}} - z_{\text{near}})}{n},
  \; z_n + \frac{i (z_{\text{far}} - z_{\text{near}})}{n}
\right]
$$

Our rendering strategy of **densely evaluating** the neural radiance field network at $N$ query points along each camera ray is inefficient, free space and occluded regions that do not contribute to the rendered image are still sampled repeatedly.

Instead, simulate two networks: **coarse network** and **fine network**.

Sample $N_c$ locations using stratified sampling, and evaluate the coarse network at these locations. Given the output of this network, we then produce a more informed sampling of points along each ray where samples are biased towards the relevant parts of the volume.

To do this, we first rewrite the alpha composited color from the coarse network $\hat{C}_c(\mathbf{r})$ as a weighted sum of all sampled colors $c_i$ along the ray:

$$\hat{C}_c(\mathbf{r}) = \sum_{i=1}^{N_c} w_i c_i, \quad w_i = T_i (1 - \exp(-\sigma_i \delta_i))$$

We can normalize these weights as $\hat{w}_i = \frac{w_i}{\sum_j w_j}$ to produce a piecewise-constant PDF along the ray.

We then sample a second set of $N_f$ locations from this distribution using inverse transform sampling, evaluate the network at the union of first and second set of samples, and compute the final rendered color of ray $\hat{C}_f(\mathbf{r})$ using $N_c + N_f$ samples.

### Loss Function

During training, the loss is simply the total squared error between the rendered and true pixel colors for both the coarse and fine renderings:

$$\mathcal{L} = \sum_{\mathbf{r}\in \mathcal{R}} \left[ \|\hat{C}_c(\mathbf{r}) - C(\mathbf{r})\|_2^2 + \|\hat{C}_f(\mathbf{r}) - C(\mathbf{r})\|_2^2 \right]$$

where $\mathcal{R}$ is the set of rays in each batch, and $C(\mathbf{r})$, $\hat{C}_c(\mathbf{r})$ and $\hat{C}_f(\mathbf{r})$ are the ground truth, coarse volume predicted and fine volume predicted RGB colors for the ray $\mathbf{r}$ respectively.

Note that even though the final rendering comes from $\hat{C}_f(\mathbf{r})$, we also minimize the loss of $\hat{C}_c(\mathbf{r})$ so that the weight distribution from the coarse network can be used to allocate samples in the fine network.

## Plenoxels
## TensoRF
## Instant NGP
## 3DGS

# Sparse Input
## DS NeRF
## VIP NeRF
## MiDAS
## FSGS
## Cor 3DGS
## Dust3R
## Instant Splat

# Dynamic Scenes
## Optical Flow
## NSFF
## RAFT
## RAFT DERF
## 4DGS

# Feedforward and BARF
## Pixel Splat
## BARF

<span style="color:crimson;font-weight:700">
This post or widget may be updated further - more notes, findings, and background will appear here!
</span>
