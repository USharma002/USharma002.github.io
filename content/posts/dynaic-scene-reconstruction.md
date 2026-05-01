---
author: ["Utkarsh Sharma"]
title: "Dynamic 3D Reconstruction with 4DGS"
date: "2026-11-22"
description: "Exploring 3D scene reconstruction techniques for dynamic scenes"
summary: "An in-depth look at modern 3D reconstruction methods such as 4DGS, comparing their architectures, strengths, and performance in diverse applications."
tags: ["3D Reconstruction", "4DGS", "Dynamic Scenes", "Computer Vision", "Deep Learning"]
categories: ["computer-vision", "3d-reconstruction", "deep-learning"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

---

# Dynamic Scenes
## Optical Flow
### Overview
Given a video, optical flow is defined as a $2D$ vector field describing the apparent movement of each pixel due to relative motion between the camera (observer) and the scene (objects, surfaces, edges). The camera or the scene or both
may be moving

### Computing Optical Flow

We define a video as an ordered sequence of frames captured over time. $I(x, y, t)$, a function of both space and time, represents the intensity of pixel $(x, y)$ in the frame at time t. In dense optical flow, at every time t and for every pixel $(x, y)$, we want to compute the apparent velocity of the pixel in both the $x$-axis and $y$-axis, given by 
$$ u(x, y, t) = \frac{\Delta x}{\Delta t}$$
$$ v(x, y, t) = \frac{\Delta y}{\Delta t}$$

The optical flow vector for each pixel is then given as $\mathbf{u} = [u, v]^{\top}$ .

### Brightness constancy assumption
From the brightness constancy assumption, we can assume that the apparent intensity in the image plane for the same object does not change across different frames.
We can define this as for a pixel that moved $\Delta x$ and $\Delta y$ in the $x$ and $y$ directions between times $t$ to $t + \Delta t$.

$$I(x, y, t) = I(x + \Delta x, y + \Delta y, t + \Delta t) $$

One common simplification is to use $\Delta t = 1$ (consecutive frames), such that the velocities are equivalent to the displacements $u = \Delta x$ and $v = \Delta y$ so can then obtain $I(x, y, t) = I(x + u, y + u, t + 1)$.

### Small motion assumption
We assume the motion $(\Delta t, \Delta y)$ is small from frame to frame. This allows us to linearize $I$ with a first-order Taylor series expansion as:
$$
\begin{aligned}
I(x+\Delta x,\, y+\Delta y,\, t+\Delta t)
&= I(x,y,t)+ \frac{\partial I}{\partial x}\,\Delta x+ \frac{\partial I}{\partial y}\,\Delta y+ \frac{\partial I}{\partial t}\,\Delta t+ \ldots \\[6pt]
&\approx
I(x,y,t)+ \frac{\partial I}{\partial x}\,\Delta x+ \frac{\partial I}{\partial y}\,\Delta y+ \frac{\partial I}{\partial t}\,\Delta t.
\end{aligned}
$$

The $\dots$ represents the higher-order terms in the Taylor series expansion which we subsequently truncate out in the next line. Substituting the result into the brightness constancy assumption, we arrive at the **optical flow constraint equation**:

$$
\begin{aligned}
0 
&= \frac{\partial I}{\partial x}\,\Delta x + \frac{\partial I}{\partial y}\,\Delta y+ \frac{\partial I}{\partial t}\,\Delta t \\[6pt]
&= \frac{\partial I}{\partial x}\,\frac{\Delta x}{\Delta t}+ \frac{\partial I}{\partial y}\,\frac{\Delta y}{\Delta t}+ \frac{\partial I}{\partial t} \\[6pt]
&= I_x\,u + I_y\,v + I_t
\end{aligned}
$$

Here, $I_x$, $I_y$, and $I_t$ denote spatial and temporal derivatives, and  $u = \frac{\Delta x}{\Delta t}$, $v = \frac{\Delta y}{\Delta t}$ are the optical flow components.

$$
-I_t = I_x u + I_y v
      = \nabla I^\top \mathbf{u}
      = \nabla I \cdot \vec{\mathbf{u}},
$$

where $\nabla I = (I_x, I_y)$ and $\mathbf{u} = (u, v)$.

We recognize this as a linear system in the form of $A x = b$.  
The spatial image gradient is

$$
\nabla I = 
\begin{bmatrix}
I_x \\[4pt]
I_y
\end{bmatrix}
\in \mathbb{R}^{2\times 1},
$$

and the unknown optical flow vector is

$$
\mathbf{u} =
\begin{bmatrix}
u \\[4pt]
v
\end{bmatrix}
\in \mathbb{R}^{2\times 1}.
$$

However, since $\nabla I$ is a *fat* matrix in the equation

$$
I_x u + I_y v = -I_t,
$$

the system is **under-constrained**: one equation with two unknowns. Thus, the brightness constancy constraint reduces the degrees of freedom from two to one, leaving infinitely many $(u, v)$ pairs that satisfy the equation.

### Lucas–Kanade ("constant" flow)
Contraint: Flow over a small patch should be the same

Assume that the surrounding patch (e.g., a $5\times5$ window) has **constant flow**.  
Then each pixel $p_i$ in the patch contributes one optical flow constraint:

$$
I_x(p_i)\,u \;+\; I_y(p_i)\,v \;=\; -I_t(p_i),
\qquad i = 1,\dots,25.
$$

This gives **25 equations** for the two unknowns $u$ and $v$.

In matrix form:

$$
\begin{bmatrix}
I_x(p_1) & I_y(p_1) \\
I_x(p_2) & I_y(p_2) \\
\vdots   & \vdots   \\
I_x(p_{25}) & I_y(p_{25})
\end{bmatrix}
\begin{bmatrix}
u \\ v
\end{bmatrix}=-
\begin{bmatrix}
I_t(p_1) \\
I_t(p_2) \\
\vdots \\
I_t(p_{25})
\end{bmatrix}.
$$

Or compactly:

$$
A\,\mathbf{u} = \mathbf{b},
$$

where

- $A\in\mathbb{R}^{25\times 2}$ contains spatial gradients $(I_x, I_y)$,
- $\mathbf{u}\in\mathbb{R}^{2\times 1}$ is the optical flow vector,
- $\mathbf{b}\in\mathbb{R}^{25\times 1}$ contains the temporal derivatives $-I_t$.

This overdetermined system is solved in the least-squares sense:

$$
\mathbf{u} = (A^\top A)^{-1} A^\top \mathbf{b}.
$$

The normal equations for Lucas–Kanade come from the matrix

$$
A^TA = \begin{bmatrix}
\displaystyle \sum_{p \in P} I_x^2 &
\displaystyle \sum_{p \in P} I_x I_y \\[10pt]
\displaystyle \sum_{p \in P} I_y I_x &
\displaystyle \sum_{p \in P} I_y^2
\end{bmatrix}.
$$

**Harris Corner Detector!**

The Harris matrix (also called the second-moment or structure tensor) which is exactly the same matrix that appears in the Lucas–Kanade optical flow formulation.

#### Implications
- Corners are when $\lambda_1$, $\lambda_2$ are big; this is also when Lucas-Kanade optical flow works best
- Corners are regions with two different directions of
gradient (at least)
- Corners are good places to compute flow

#### Problem
What happens if the image patch contains only a single edge or line?
We can only recover the component of the optical flow that is perpendicular to the edge (parallel to the spatial image gradient). Motion parallel to the edge itself is ambiguous and cannot be recovered mathematically from local gradients alone. This is the **aperture problem**.
Want patches with different gradients (like corners) to avoid the aperture problem.
### Horn-Schunck ("smooth" flow)
Contraint: Flow of neighboring pixels should be smooth

The optical flow has the following objective funcitons

**Brightness Constance Assumption**
$$
E_d(i, j)=\left( I_x\,u_{ij} + I_y\,v_{ij} + I_t \right)^2
$$

**Smooth Motion Assumption**
$$
E_s(i, j) = \frac{1}{4} \left[
(u_{ij} - u_{i+1,j})^2 +
(u_{ij} - u_{i,j+1})^2 +
(v_{ij} - v_{i+1,j})^2 +
(v_{ij} - v_{i,j+1})^2
\right]
$$

In Horn-Schunck  optical flow we do the following:
$$\min_{u, v}\sum_{ij}\left[ E_d(i, j) + \lambda E_s(i, j) \right]$$

We can compute partial derivative, derive update equations (gradient decent)

---

## 4DGS
All the dynamic NeRF algorithms can be formulated as:

c, σ = M(x, d, t, λ)

where M is a mapping that maps 8D space (x, d, t, λ) to
4D space (c, σ). x reveals to the spatial point, and λ is the
optional input as used to build topological and appearance
changes, and d stands for view-dependency.

all the deformation NeRF based
methods estimate the world-to-canonical mapping by a
deformation network ϕt : (x, t) → ∆x. Then a network is
introduced to compute volume density and view-dependent
RGB color from each ray. The formula for rendering can be
expressed as:
c, σ = NeRF(x + ∆x, d, λ),
λ is a
frame-dependent code to model the topological and appearance change

### Overview
compute
the canonical-to-world mapping directly at time t using
a Gaussian deformation field network F, and differential
splatting follows. This enables the capability of computing backward flow and tracking for 3D Gaussians

### Method

given a view matrix M = [R, T], timestamp t, our 4D Gaussian splatting framework includes 3D
Gaussians G and Gaussian deformation field network F.
Then a novel-view image ˆI is rendered by differential splatting [63] S following ˆI = S(M, G
′
), where  G
′ = ∆G + G.

Specifically, the deformation of 3D Gaussians ∆G is introduced by the Gaussian deformation field network ∆G =
F(G, t), in which the spatial-temporal structure encoder H
can encode both the temporal and spatial features of 3D
Gaussians fd = H(G, t). And the multi-head Gaussian deformation decoder D can decode the features and predict
each 3D Gaussian’s deformation ∆G = D(f), then the deformed 3D Gaussians G
′
can be introduced.

---
