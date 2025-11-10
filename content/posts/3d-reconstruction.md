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

### Overview

{{< figure src="../../images/3dvis/nerf-overview.png"
num="1"
caption="NeRF Overview"
width="100%" 
>}}

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

{{< figure src="../../images/3dvis/nerf-mlp.png"
num="2"
caption="NeRF MLP Architecture"
width="100%" 
>}}

## Plenoxels: Radiance Fields without Neural Networks

### Overview
{{< figure src="../../images/3dvis/plenoxel-overview.png"
num="3"
caption="Plenoxels Overview"
width="100%" 
>}}

In light of the substantial computational requirements of NeRF for both training and rendering,
many recent papers have proposed methods to improve efficiency, particularly for rendering.

### Method

Plenoxels (plenoptic voxels) represent a scene as a sparse 3D grid with spherical harmonics. This representation can be optimized from calibrated images via gradient methods and regularization without any neural components.

### Spherical Harmonics
Uses spherical haromnic coefficients $\mathbf{k}$, rather than RGB values:

$$(\mathbf{k}, \sigma), \quad \mathbf{k} = (k^m_l)^{m:-l \leq m \leq l}_{l: 0 \leq l \leq l_{max}}$$

Each $k_l^m \in \mathbb{R}^{3}$ is a set of 3 coeffieincts corresponding to RGB components. In this setup, the view dependednt color $\mathbf{c}$ at a point $\mathbf{x}$ may be determined by querying the SH funcitons $Y_l^m:\mathbb{S}\rightarrow\mathbb{R}$ at desired vieweing angle $\mathbf{d}$:

$$c(\mathbf{x}; \mathbf{k}) = S=sigmoid\left( \sum_{l-0}^{l_{max}}\sum_{m=-l}^{m} k_l^mY_l^m(\mathbf{d}) \right)$$

{{< figure src="../../images/3dvis/spherical-harmonics.png"
num="4"
caption="Spherical Harmonics"
width="60%" 
>}}

### Interpolation

So, each vertex of the grid has the SH coefficients and opacity $\sigma$.

The opacity and color at each sample point along ray are computed by trilinear interpolation of opacity and harmonic coefficinets stored at nearest 8 voxels.

### Coarse to Fine 

Achieves high resolution via coars-to-fine strategy that begins with a dense grid at lower resolution, optimizes, prunes unnecessary voxelss, refins the remaining voxels by subdividing each in half in each dimension, and continues optimizing.

Voxel pruning is performed using the method from PlenOctrees [Paper here](), which applies a threshold to the maximum weight $T_i(1 - \exp(-\sigma_i \delta_i))$ of each voxel over all training ray (or, alternatively, to the density value in each voxel). 

{{< figure src="../../images/3dvis/plenoctree.png"
num="5"
caption="Plenoctree Visualization"
width="60%" 
>}}

Due to trilinear interpolation, naively pruning can adversely impact the the color and density near surfaces since values at these points interpolate with the voxels in the immediate exterior, to solve this, they performed a dilation operation so that voxel is only pruned if both itself and its neighbors are deemed unoccupied.


### Optimization

Optimize the voxel opacities and spherical harmonic coefficients with respect to the mean squared error (MSE) over rendered pixel xolors with total variation (TV) regularization. Specifically, the loss is:

$$\mathcal{L} = \mathcal{L}_{recon} + \lambda_{TV}\mathcal{L}_{TV}$$

where these losses are defined as
$$\mathcal{L}_{\text{recon}}= \frac{1}{|\mathcal{R}|} \sum_{\mathbf{r} \in \mathcal{R}}\left\| C(\mathbf{r}) - \hat{C}(\mathbf{r}) \right\|_2^2 $$

$$\mathcal{L}_{\text{TV}} = \frac{1}{|\mathcal{V}|} \sum_{\mathbf{v} \in \mathcal{V}} \sum_{d \in [D]} \sqrt{\Delta_x^2(\mathbf{v}, d)+ \Delta_y^2(\mathbf{v}, d)+ \Delta_z^2(\mathbf{v}, d)}
$$

where $ \Delta_x^2(\mathbf{v}, d) $ denotes the squared difference between the $ d^\text{th} $ value in voxel $ \mathbf{v} := (i, j, k) $ and the $ d^\text{th} $ value in voxel $ (i + 1, j, k) $, normalized by the resolution. Analogously, $ \Delta_y^2(\mathbf{v}, d) $ and $ \Delta_z^2(\mathbf{v}, d) $ represent the squared differences along the $ y $- and $ z $-axes, respectively.


## TensoRF

### Overview

{{< figure src="../../images/3dvis/tensorf-overview.png"
num="6"
caption="TensoRF (VM) reconstruction and rendering."
width="100%" 
>}}


Unlike NeRF that purely uses MLPs, TensoRF models the radiance field of a scene as a 4D tensor, which represents a 3D voxel grid with per-voxel multi-channel features. The central idea is to factorize the 4D scene tensor into multiple compact low-rank tensor components.

TensoRF presents a novel vector-matrix (VM) decomposition technique that effectively reduces the number of components required for the same expression capacity, leading to faster reconstruction and better rendering than the classic CANDECOMP/PARAFAC (CP) decomposition.

### CP Decomposition

Given a 3D tensor $\mathcal{T} \in \mathbb{R}^{I \times J \times K}$, CP decomposition factorizes it into a sum of outer products of vectors:

$$
\mathcal{T} = \sum_{r=1}^R \mathbf{v}_r^{1} \circ \mathbf{v}_r^{2} \circ \mathbf{v}_r^{3}
$$

where $\mathbf{v}_{r}^{1} \circ \mathbf{v}_{r}^{2} \circ \mathbf{v}_r^{3}$ corresponds to a rank-one tensor component, and $\mathbf{v}_r^{1} \in \mathbb{R}^{I}$, $\mathbf{v}_r^{2} \in \mathbb{R}^{J}$, and $\mathbf{v}_r^{3} \in \mathbb{R}^{K}$ are factorized vectors of the three modes for the $r^\text{th}$ component. Superscripts denote the modes of each factor; $\circ$ represents the outer product. Hence, each tensor element $\mathcal{T}_{ijk}$ is a sum of scalar products:

$$
\mathcal{T}_{ijk} = \sum_{r=1}^R \mathbf{v}_{r,i}^{1} \mathbf{v}_{r,j}^{2} \mathbf{v}_{r,k}^{3}
$$

where $i, j, k$ denote the indices of the three modes.

CP decomposition factorizes a tensor into multiple vectors, expressing multiple compact rank-one components. However, because of too high compactness, CP decomposition can require many components to model complex scenes, leading to high computational costs in radiance field reconstruction.

### Vector-Matrix (VM) Decomposition

Unlike CP decomposition that utilizes pure vector factors, VM decomposition factorizes a tensor into multiple vectors and matrices. This is expressed by:

$$
\mathcal{T} = \sum_{r=1}^{R_1} \mathbf{v}_r^{1} \circ \mathbf{M}_r^{2,3} + \sum_{r=1}^{R_2} \mathbf{v}_r^{2} \circ \mathbf{M}_r^{1,3} + \sum_{r=1}^{R_3} \mathbf{v}_r^{3} \circ \mathbf{M}_r^{1,2}
$$

where $\mathbf{M}_r^{2,3} \in \mathbb{R}^{J \times K}$, $\mathbf{M}_r^{1,3} \in \mathbb{R}^{I \times K}$, and $\mathbf{M}_r^{1,2} \in \mathbb{R}^{I \times J}$ are matrix factors for two (denoted by superscripts) of the three modes.

For each component, we relax its two mode ranks to be arbitrarily large, while restricting the third mode to be rank-one; e.g., for component tensor $\mathbf{v}_r^{1} \circ \mathbf{M}_r^{2,3}$, its mode-1 rank is 1, and its mode-2 and mode-3 ranks can be arbitrary, depending on the rank of the matrix $\mathbf{M}_r^{2,3}$.

{{< figure src="../../images/3dvis/cp_vm_factorization.png"
num="7"
caption="Tensor factorization. Left: CP decomposition, which factorizes a tensor as a sum of vector outer products. Right: our vector-matrix decomposition, which factorizes a tensor as a sum of vector-matrix outer products."
width="100%" 
>}}


### Tensor for Scene Modeling

In this work, we focus on the task of modeling and reconstructing radiance fields. We can view the image [below](#scene-tensorf). In this case, the three tensor modes correspond to the XYZ axes, and we thus directly denote the modes with XYZ to make it intuitive. Meanwhile, in the context of 3D scene representation, we consider $R_1 = R_2 = R_3 = R$ for most scenes, reflecting the fact that a scene can distribute and appear equally complex along its three axes. Therefore, the previous equation can be re-written as:

$$
\mathcal{T} = \sum_{r=1}^{R} \mathbf{v}_r^{X} \circ \mathbf{M}_r^{Y,Z} + \mathbf{v}_r^{Y} \circ \mathbf{M}_r^{X,Z} + \mathbf{v}_r^{Z} \circ \mathbf{M}_r^{X,Y}
$$

In addition, to simplify notation and the following discussion in later sections, we also denote the three types of component tensors as $A_r^{X} = \mathbf{v}_r^{X} \circ \mathbf{M}_r^{Y,Z}$, $A_r^{Y} = \mathbf{v}_r^{Y} \circ \mathbf{M}_r^{X,Z}$, and $A_r^{Z} = \mathbf{v}_r^{Z} \circ \mathbf{M}_r^{X,Y}$; here the superscripts XYZ of $A$ indicate different types of components.

With this, a tensor element $\mathcal{T}_{ijk}$ is expressed as:

$$
\mathcal{T}_{ijk} = \sum_{r=1}^{R} \sum_{m} \mathcal{A}_{r,ijk}^{m}
$$

where $m \in \{X, Y, Z\}$, $A_{r,ijk}^{X} = v_{r,i}^{X} M_{r,jk}^{Y,Z}$, $A_{r,ijk}^{Y} = v_{r,j}^{Y} M_{r,ik}^{X,Z}$, and $A_{r,ijk}^{Z} = v_{r,k}^{Z} M_{r,ij}^{X,Y}$.

### Feature Grids and Radiance Field

We leverage a regular 3D grid G with per-voxel multi-channel features to model such a function. We split it (by feature channels) into a geometry grid $\mathcal{G}_{\sigma}$ and an appearance grid $\mathcal{G}_{c}$, separately modelling the volume density $\sigma$ and view-dependent color $c$:

$$
\sigma, c = \mathcal{G}_{\sigma}(\mathbf{x}), \; \mathcal{S}(\mathcal{G}_{c}(\mathbf{x}), d)
$$

where $\mathcal{G}_{\sigma}(\mathbf{x})$, $\mathcal{G}_{c}(\mathbf{x})$ represent the trilinearly interpolated features from the two grids at location $\mathbf{x}$. We model $\mathcal{G}_{\sigma}$ and $\mathcal{G}_{c}$ as factorized tensors.

### Factorizing Radiance Fields

While $\mathcal{G}_{\sigma} \in \mathbb{R}^{I \times J \times K}$ is a 3D tensor, $\mathcal{G}_{c} \in \mathbb{R}^{I \times J \times K \times P}$ is a 4D tensor. Here $I, J, K$ correspond to the resolutions of the feature grid along the X, Y, Z axes, and $P$ is the number of appearance feature channels.

We factorize these radiance field tensors to compact components. In particular, with the VM decomposition, the 3D geometry tensor $\mathcal{G}_{\sigma}$ is factorized as:

$$
\mathcal{G}_{\sigma} = \sum_{r=1}^{R_{\sigma}} \mathbf{v}_{\sigma,r}^{X} \circ \mathbf{M}_{\sigma,r}^{Y,Z} + \mathbf{v}_{\sigma,r}^{Y} \circ \mathbf{M}_{\sigma,r}^{X,Z} + \mathbf{v}_{\sigma,r}^{Z} \circ \mathbf{M}_{\sigma,r}^{X,Y} = \sum_{r=1}^{R_{\sigma}} \sum_{m \in \{X,Y,Z\}} \mathcal{A}_{\sigma,r}^{m}
$$

The appearance tensor $\mathcal{G}_{c}$ has an additional mode corresponding to the feature channel dimension:

$$
\mathcal{G}_{c} = \sum_{r=1}^{R_{c}} \mathbf{v}_{c,r}^{X} \circ \mathbf{M}_{c,r}^{Y,Z} \circ \mathbf{b}_{3r-2} + \mathbf{v}_{c,r}^{Y} \circ \mathbf{M}_{c,r}^{X,Z} \circ \mathbf{b}_{3r-1} + \mathbf{v}_{c,r}^{Z} \circ \mathbf{M}_{c,r}^{X,Y} \circ \mathbf{b}_{3r}
$$

$$
= \sum_{r=1}^{R_{c}} \mathcal{A}_{c,r}^{X} \circ \mathbf{b}_{3r-2} + \mathcal{A}_{c,r}^{Y} \circ \mathbf{b}_{3r-1} + \mathcal{A}_{c,r}^{Z} \circ \mathbf{b}_{3r}
$$

Note that we have $3R_{c}$ vectors $\mathbf{b}_{r}$ to match the total number of components.

Overall, we factorize the entire tensorial radiance field into $3R_{\sigma} + 3R_{c}$ matrices ($\mathbf{M}_{\sigma,r}^{Y,Z}, \ldots, \mathbf{M}_{c,r}^{Y,Z}, \ldots$) and $3R_{\sigma} + 6R_{c}$ vectors ($\mathbf{v}_{\sigma,r}^{X}, \ldots, \mathbf{v}_{c,r}^{X}, \ldots, \mathbf{b}_{r}$).

In general, we adopt $R_{\sigma} \ll I, J, K$ and $R_{c} \ll I, J, K$, leading to a highly compact representation that can encode a high-resolution dense grid.

In essence, the XYZ-mode vector and matrix factors $\mathbf{v}_{\sigma,r}^{X}, \mathbf{M}_{\sigma,r}^{Y,Z}, \mathbf{v}_{c,r}^{X}, \mathbf{M}_{c,r}^{Y,Z}, \ldots$ describe the spatial distributions of the scene geometry and appearance along their corresponding axes. On the other hand, the appearance feature-mode vectors $\mathbf{b}_{r}$ express the global appearance correlations.

By stacking all $\mathbf{b}_{r}$ as columns together, we have a $P \times 3R_{c}$ matrix $\mathbf{B}$; this matrix $\mathbf{B}$ can also be seen as a global appearance dictionary that abstracts the appearance commonalities across the entire scene.

### Interpolation

Naively achieving trilinear interpolation is costly, as it requires evaluation of 8 tensor values and interpolating them, increasing computation by a factor of 8 compared to computing a single tensor element. However, we find that trilinearly interpolating a component tensor is naturally equivalent to interpolating its vector/matrix factors linearly/bilinearly for the corresponding modes, thanks to the beauty of linearity of the trilinear interpolation and the outer product.

{{< figure src="../../images/3dvis/tensorf_scene.png"
num="8"
id="scene-tensorf"
caption="Tensorf Scene Representation."
width="100%" 
>}}


## Instant NGP

### Overview

{{< figure src="../../images/3dvis/instant-ngp-overview.png"
num="9"
caption="Instant-NGP Overview."
width="100%" 
>}}

Given a fully connected neural network $m(y; \Phi)$, we are interested in  
an encoding of its inputs $y = \text{enc}(x; \theta)$ that improves the approximation quality and training speed across a wide range of applications  without incurring a notable performance overhead.  

### Multiresolution Hash Encoding
Our neural network not only has trainable weight parameters $\Phi$, but also trainable encoding parameters $\theta$. These are arranged into $L$ levels, each containing up to $T$ feature vectors  
with dimensionality $D$.

Each level (two of which are shown as red and blue in the figure) is independent and conceptually stores feature vectors at the vertices of a grid, the resolution of which is chosen to be a geometric progression between the coarsest and finest resolutions $[N_{\min}, N_{\max}]$:

$$
N_l := \left\lfloor N_{\min} \cdot b^{\,l} \right\rfloor,
$$

$$
b := \exp\!\left( \frac{\ln N_{\max} - \ln N_{\min}}{L - 1} \right).
$$

$N_{\max}$ is chosen to match the finest detail in the training data. Due to the large number of levels $L$, the growth factor is usually small.

We map each corner to an entry in the level’s respective feature vector array,  which has a fixed size of at most $T$.  For coarse levels where a dense grid requires fewer than $T$ parameters, i.e. $(N_l + 1)^d \leq T$, this mapping is $1\!:\!1$.


At finer levels, we use a hash function $h : \mathbb{Z}^d \rightarrow \mathbb{Z}_T$ to index into the array, effectively treating it as a hash table, although there is no explicit collision handling.  We rely instead on the gradient-based optimization to store appropriate sparse detail in the array, and the subsequent neural network $m(y; \Phi)$ for collision resolution.  

The number of trainable encoding parameters $\theta$ is therefore $\mathcal{O}(T)$ and bounded by $T \cdot L \cdot D$.

Uses a spatial hash function of the form
$$
h(\mathbf{x}) =
\left( \sum_{i=1}^{d} x_i \, \pi_i \right)
\bmod T,
\tag{4}
$$


## 3DGS
### Overview
{{< figure src="../../images/3dvis/3dgs-overview.png"
num="10"
caption="3DGS Overview"
width="100%" 
>}}

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
