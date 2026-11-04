---
author: ["Utkarsh Sharma"]
title: "Introduction to 3D Rendering"
date: "2026-04-30"
description: "An introduction to 3D rendering: homogeneous coordinates, transforms, the rendering pipeline, primary rays, ray-object intersection, shading, ray tracing, path tracing, and signed distance functions."
summary: "3D rendering from first principles: transforms, camera and projection, ray generation, intersections, shading, ray tracing, path tracing, and signed distance functions."
tags: ["Rendering", "Computer Graphics"]
categories: ["Computer Graphics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---



<!-- <div style="background: var(--code-bg, #f6f8fa); border-left: 3px solid #3b82f6; border-radius: 6px; padding: 1rem 1.25rem; margin: 1.5rem 0; font-size: 0.95rem;">
<strong>This series</strong><br>
<strong>① Introduction to Rendering</strong> (this post) — homogeneous coordinates, the rendering pipeline, ray generation, geometry intersections, and shading basics.<br>
② <a href="../path-tracing">Monte Carlo Path Tracing &amp; Importance Sampling</a> — the rendering equation, Monte Carlo integration, BRDFs, and physically based shading.<br>
③ <a href="../differentiable-rendering">Introduction to Differentiable Rendering</a> — gradients through the rendering pipeline, inverse rendering, and scene optimisation.<br>
④ <a href="../3d-reconstruction">3D Reconstruction: NeRF &amp; 3DGS</a> — neural radiance fields, 3D Gaussian splatting, and modern scene representations.
</div> -->


## Introduction to Rendering

The transforms, the rendering pipeline, the ray-sphere test, the reflection and refraction vectors and the lighting model follow Lengyel, *Mathematics for 3D Game Programming and Computer Graphics* [[2]](#ref-2). The transform hierarchy follows Szeliski [[1]](#ref-1), and the rest draws on the IISc graphics course notes [[13]](#ref-13) and the papers cited in each section.

Rendering is the process of generating a 2D image from a 3D scene. There are two basic approaches. **Rasterization** projects each object onto the image plane and fills the pixels it covers. **Ray tracing** follows a ray from the camera through each pixel into the scene and finds what it hits.

This post builds both from the ground up:
* homogeneous coordinates and transforms
* the rendering pipeline (object, world, camera, homogeneous clip and window space)
* primary rays, ray-object intersection and shading
* ray tracing and path tracing (path tracing is covered in detail in a separate post)
* signed distance functions and sphere tracing

The GLSL code in each part implements the equations given in the text.

---

## Homogeneous Coordinates

A $3 \times 3$ matrix $\mathbf{M}$ can scale and rotate a point, but it cannot translate it, because $\mathbf{M}\mathbf{0}=\mathbf{0}$ for every matrix. A change of coordinate system therefore has the form

$$\mathbf{P}' = \mathbf{M}\mathbf{P} + \mathbf{T},$$

where $\mathbf{T}$ is a 3D translation vector. Applying two such transforms gives

$$\mathbf{P}' = \mathbf{M}_2(\mathbf{M}_1\mathbf{P} + \mathbf{T}_1) + \mathbf{T}_2 = (\mathbf{M}_2\mathbf{M}_1)\mathbf{P} + \mathbf{M}_2\mathbf{T}_1 + \mathbf{T}_2,$$

so the matrix part and the translation part have to be tracked separately at every step.

### Four-Dimensional Transforms

The fix is to extend vectors to four-dimensional **homogeneous coordinates**. A 3D point $\mathbf{P}$ gets a fourth coordinate, the $w$ coordinate, equal to $1$, and $\mathbf{M}$ and $\mathbf{T}$ are combined into one $4 \times 4$ matrix:

$$
\mathbf{F} =
\begin{bmatrix}
\mathbf{M} & \mathbf{T} \\
\mathbf{0} & 1
\end{bmatrix} =
\begin{bmatrix}
M_{11} & M_{12} & M_{13} & T_x \\
M_{21} & M_{22} & M_{23} & T_y \\
M_{31} & M_{32} & M_{33} & T_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

Multiplying $\mathbf{F}$ by $\langle P_x, P_y, P_z, 1 \rangle$ gives $\langle \mathbf{M}\mathbf{P} + \mathbf{T},\, 1 \rangle$, and the product of two matrices of this form is again a matrix of this form, so a chain of transforms is one matrix. Vectors are columns and matrices multiply on the left, so in $\mathbf{F}_2\mathbf{F}_1\mathbf{P}$ the transform $\mathbf{F}_1$ is applied first. Solving $\mathbf{P}' = \mathbf{M}\mathbf{P} + \mathbf{T}$ for $\mathbf{P}$ gives the inverse:

$$
\mathbf{F}^{-1} =
\begin{bmatrix}
\mathbf{M}^{-1} & -\mathbf{M}^{-1}\mathbf{T} \\
\mathbf{0} & 1
\end{bmatrix}
$$

### Points and Directions

Direction vectors should not change under translation. They are extended to four dimensions with $w = 0$, which nullifies the fourth column of $\mathbf{F}$:

$$
\begin{bmatrix}
\mathbf{M} & \mathbf{T} \\
\mathbf{0} & 1
\end{bmatrix}
\begin{bmatrix}
\mathbf{V} \\ 0
\end{bmatrix}=
\begin{bmatrix}
\mathbf{M}\mathbf{V} \\ 0
\end{bmatrix}
$$

| $w$ | Meaning | Affected by $\mathbf{T}$? |
|-----|---------|---------------------------|
| $1$ | point | yes |
| $0$ | direction | no |

The difference $\mathbf{Q} - \mathbf{P}$ of two points with $w = 1$ has $w = 0$. It is the direction from $\mathbf{P}$ to $\mathbf{Q}$, which a translation should not affect.

### Geometrical Interpretation of the w Coordinate

For a 4D point $\mathbf{P} = \langle x, y, z, w \rangle$ with $w \neq 0$, the 3D point $\tilde{\mathbf{P}}$ it represents is its projection into the space $w = 1$:

$$\tilde{\mathbf{P}} = \left\langle \frac{x}{w},\, \frac{y}{w},\, \frac{z}{w} \right\rangle$$

This is the point where the line through $\mathbf{P}$ and the origin meets the space $w = 1$, so every nonzero scalar multiple of $\langle x, y, z, w \rangle$ represents the same 3D point. The division by $w$ is what makes perspective projection possible (see [Perspective Projection](#perspective-projection)).

{{< figure src="/images/intro-to-rendering/homogeneous_coords.svg" caption="Projection onto the space $w = 1$, drawn one dimension lower: the point $(x, y)$ corresponds to every point on the line through $(x, y, 1)$ and the origin." width="500px" align="center" >}}

---

## 2D Transformations

Transforms are grouped by their degrees of freedom (DoF) and the geometric properties they preserve. This hierarchy is from Szeliski [[1]](#ref-1); the matrices use the homogeneous form above.

---

### 2D Translation — 2 DoF

$$x' = x + t_x, \qquad y' = y + t_y$$

{{< figure src="/images/intro-to-rendering/translate.svg" caption="Translation slides every point by the same vector $(t_x, t_y)$, leaving shapes unchanged." width="400px" align="center" >}}

Appending $w=1$ converts the addition into a $3 \times 3$ matrix multiply:

$$ \begin{bmatrix} \color{#ef4444}1 & \color{#22c55e}0 & \color{#3b82f6}t_x \\ \color{#ef4444}0 & \color{#22c55e}1 & \color{#3b82f6}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = \begin{bmatrix} x + t_x \\ y + t_y \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, area, orientation, parallelism, straight lines.
- **DoF**: 2 ($t_x$, $t_y$).

<iframe src="/interactive/transformations/graph.html?type=translation" title="2D translation demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 2D Rigid / Euclidean — 3 DoF

A rigid transform is a rotation followed by a translation. A positive angle $\theta$ rotates counterclockwise. Rotating $\mathbf{P}$ by $90^\circ$ gives $\mathbf{Q} = \langle -P_y, P_x \rangle$, and the rotated vector is $\mathbf{P}' = \mathbf{P}\cos\theta + \mathbf{Q}\sin\theta$, so

$$P'_x = P_x\cos\theta - P_y\sin\theta, \qquad P'_y = P_y\cos\theta + P_x\sin\theta$$

{{< figure src="/images/intro-to-rendering/rotation.svg" caption="Rotation about the origin by $\theta$: $\mathbf{P}' = \mathbf{P}\cos\theta + \mathbf{Q}\sin\theta$, where $\mathbf{Q} = \langle -P_y, P_x \rangle$." width="400px" align="center" >}}

The $2 \times 2$ rotation block $\mathbf{R}$ is orthogonal ($\mathbf{R}^{-1} = \mathbf{R}^\mathrm{T}$) with $\det\mathbf{R} = 1$. An orthogonal matrix preserves dot products, and therefore lengths and angles.

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}\cos\theta & \color{#22c55e}-\sin\theta & \color{#3b82f6}0 \\ \color{#ef4444}\sin\theta & \color{#22c55e}\cos\theta & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

Adding a translation column gives the full rigid (Euclidean) transform.

- **Preserves**: lengths, angles, orientation.
- **DoF**: 3 (1 rotation angle $\theta$, 2 translations).

<iframe src="/interactive/transformations/graph.html?type=euclidean" title="2D rigid transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 2D Scaling — 2 DoF

$$x' = s_x \cdot x, \qquad y' = s_y \cdot y$$

{{< figure src="/images/intro-to-rendering/scaling.svg" caption="Scaling stretches or compresses relative to the origin. The axes can be scaled independently." width="400px" align="center" >}}

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}s_x & \color{#22c55e}0 & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}s_y & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

What is preserved depends on whether the scale is uniform:

- **Uniform scaling** ($s_x = s_y = s > 0$) preserves angles, orientation and parallelism. Lengths are multiplied by $s$.
- **Non-uniform scaling** ($s_x \neq s_y$) changes angles. In general only parallelism is preserved.

- **DoF**: 2 ($s_x$, $s_y$).

<iframe src="/interactive/transformations/graph.html?type=scaling" title="2D scaling demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 2D Affine — 6 DoF

An affine transform allows *any* invertible $2 \times 2$ matrix $\mathbf{A}$ in the upper-left block, not only a rotation. By the singular value decomposition $\mathbf{A} = \mathbf{U}\boldsymbol{\Sigma}\mathbf{V}^\mathrm{T}$, every such matrix is a rotation or reflection, a non-uniform scale and another rotation or reflection. This adds **shearing** to the transforms above.

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}a_{11} & \color{#22c55e}a_{12} & \color{#3b82f6}t_x \\ \color{#ef4444}a_{21} & \color{#22c55e}a_{22} & \color{#3b82f6}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism (parallel lines stay parallel; lengths and angles can change).
- **DoF**: 6 (four entries of $\mathbf{A}$ + $t_x$ + $t_y$).

<iframe src="/interactive/transformations/graph.html?type=affine" title="2D affine transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 2D Projective / Homography — 8 DoF

Now the *bottom row* of the matrix may also take any values. The result is no longer affine: $w'$ depends on the input point, so the result is divided by $w'$ to get Cartesian coordinates.

$$ \begin{bmatrix} x' \\ y' \\ w' \end{bmatrix} = \begin{bmatrix} \color{#ef4444}h_{11} & \color{#22c55e}h_{12} & \color{#3b82f6}h_{13} \\ \color{#ef4444}h_{21} & \color{#22c55e}h_{22} & \color{#3b82f6}h_{23} \\ \color{#ef4444}h_{31} & \color{#22c55e}h_{32} & \color{#3b82f6}h_{33} \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}, \qquad x_{\text{out}} = \frac{x'}{w'}, \quad y_{\text{out}} = \frac{y'}{w'}$$

The $9$ matrix entries have only $8$ DoF because multiplying every entry by a nonzero scalar $\lambda$ produces the same map (division by $w'$ cancels $\lambda$).

- **Preserves**: straight lines (but parallel lines can converge to a **vanishing point**).
- **DoF**: 8.

<iframe src="/interactive/transformations/graph.html?type=projective" title="2D projective transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

### Custom 2D Transform

<iframe src="/interactive/transformations/graph.html?type=custom" title="Custom 2D transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

## 3D Transformations

In 3D the transforms are $4 \times 4$ matrices of the form $\mathbf{F}$ acting on $\langle x, y, z, w \rangle$, with $w = 1$ for points and $w = 0$ for directions.

---

### 3D Translation — 3 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}1 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}t_x \\ \color{#ef4444}0 & \color{#22c55e}1 & \color{#3b82f6}0 & \color{#a855f7}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, orientation.
- **DoF**: 3.

<iframe src="/interactive/transformations/graph3d.html?type=translation" title="3D translation demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 3D Rigid / Euclidean — 6 DoF

The $3 \times 3$ block $\mathbf{R}$ is orthogonal with $\det\mathbf{R} = 1$. Extending the 2D rotation with a row and column of the identity gives the rotations about the coordinate axes. A positive angle is counterclockwise when the axis points toward the viewer:

$$
\mathbf{R}_x(\theta) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \cos\theta & -\sin\theta \\ 0 & \sin\theta & \cos\theta \end{bmatrix},\quad
\mathbf{R}_y(\theta) = \begin{bmatrix} \cos\theta & 0 & \sin\theta \\ 0 & 1 & 0 \\ -\sin\theta & 0 & \cos\theta \end{bmatrix},\quad
\mathbf{R}_z(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}
$$

A general rotation is a product of these. In homogeneous form it fills the upper-left block, with the translation in the fourth column:

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}r_{11} & \color{#22c55e}r_{12} & \color{#3b82f6}r_{13} & \color{#a855f7}t_x \\ \color{#ef4444}r_{21} & \color{#22c55e}r_{22} & \color{#3b82f6}r_{23} & \color{#a855f7}t_y \\ \color{#ef4444}r_{31} & \color{#22c55e}r_{32} & \color{#3b82f6}r_{33} & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, orientation.
- **DoF**: 6 (3 rotation angles, 3 translations).

<iframe src="/interactive/transformations/graph3d.html?type=rotation" title="3D rotation demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 3D Scaling — 3 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}s_x & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}s_y & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}s_z & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism. Angles preserved only if $s_x = s_y = s_z$.
- **DoF**: 3.

<iframe src="/interactive/transformations/graph3d.html?type=scaling" title="3D scaling demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 3D Affine — 12 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}a_{11} & \color{#22c55e}a_{12} & \color{#3b82f6}a_{13} & \color{#a855f7}t_x \\ \color{#ef4444}a_{21} & \color{#22c55e}a_{22} & \color{#3b82f6}a_{23} & \color{#a855f7}t_y \\ \color{#ef4444}a_{31} & \color{#22c55e}a_{32} & \color{#3b82f6}a_{33} & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism.
- **DoF**: 12 (nine free entries in $\mathbf{A}$ + three translations).

<iframe src="/interactive/transformations/graph3d.html?type=shear" title="3D shear demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

### 3D Projective — 15 DoF

When the bottom row of the $4 \times 4$ matrix takes arbitrary values, the result is a general projective transform. The product has $w' \neq 1$, and the 3D point is recovered by dividing by $w'$.

$$ \begin{bmatrix} x' \\ y' \\ z' \\ w' \end{bmatrix} = \begin{bmatrix} \color{#ef4444}h_{11} & \color{#22c55e}h_{12} & \color{#3b82f6}h_{13} & \color{#a855f7}h_{14} \\ \color{#ef4444}h_{21} & \color{#22c55e}h_{22} & \color{#3b82f6}h_{23} & \color{#a855f7}h_{24} \\ \color{#ef4444}h_{31} & \color{#22c55e}h_{32} & \color{#3b82f6}h_{33} & \color{#a855f7}h_{34} \\ \color{#ef4444}h_{41} & \color{#22c55e}h_{42} & \color{#3b82f6}h_{43} & \color{#a855f7}h_{44} \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}, \qquad x_{\text{out}} = \frac{x'}{w'},\ y_{\text{out}} = \frac{y'}{w'},\ z_{\text{out}} = \frac{z'}{w'}$$

The 16 entries have 15 DoF because scaling every entry by the same $\lambda$ gives the same map. The perspective projection matrix $\mathbf{M}_\text{frustum}$ derived below is one member of this family.

- **Preserves**: straight lines (parallel lines can converge at a vanishing point).
- **DoF**: 15.

<iframe src="/interactive/transformations/graph3d.html?type=projective" title="3D projective transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

### Custom 3D Transform

<iframe src="/interactive/transformations/graph3d.html?type=custom" title="Custom 3D transform demo" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

---

## Transformation Hierarchy Summary

<style>
.transform-table-wrapper {
    width: 100%;
    text-align: center;
    margin: 2.5rem 0;
    overflow-x: auto;
    display: block;
}
.transform-table {
    display: inline-table;
    margin: 0 auto !important;
    width: auto !important;
    border-collapse: collapse;
    font-family: "Times New Roman", Times, serif;
    font-size: 1.1rem;
    color: var(--primary);
}
.transform-table th {
    border-top: 2px solid var(--primary);
    border-bottom: 1px solid var(--primary);
    padding: 12px 24px;
    font-weight: bold;
    text-align: center;
}
.transform-table td {
    padding: 16px 24px;
    vertical-align: middle;
    text-align: center;
}
.transform-table tr:last-child td {
    border-bottom: 2px solid var(--primary);
}
.transform-table .text-left { text-align: left; }
.transform-icon {
    width: 44px; height: 44px;
    stroke: currentColor; stroke-width: 1.5; fill: none;
    display: inline-block; vertical-align: middle;
}
</style>

### 2D

<div class="transform-table-wrapper">
<table class="transform-table">
    <tr>
        <th class="text-left">Transform</th><th>Matrix</th><th>DoF</th><th class="text-left">Preserves</th><th>Icon</th>
    </tr>
    <tr>
        <td class="text-left">translation</td>
        <td>$\big[\, I \bigm| t \,\big]_{2 \times 3}$</td>
        <td>2</td>
        <td class="text-left">lengths, angles, orientation</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">rigid (Euclidean)</td>
        <td>$\big[\, R \bigm| t \,\big]_{2 \times 3}$</td>
        <td>3</td>
        <td class="text-left">lengths, angles, orientation</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">affine</td>
        <td>$\big[\, A \,\big]_{2 \times 3}$</td>
        <td>6</td>
        <td class="text-left">parallelism</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="8,4 22,4 16,20 2,20" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">projective</td>
        <td>$\big[\, \tilde{H} \,\big]_{3 \times 3}$</td>
        <td>8</td>
        <td class="text-left">straight lines</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="6,6 20,2 20,22 6,18" /></svg></td>
    </tr>
</table>
</div>

### 3D

<div class="transform-table-wrapper">
<table class="transform-table">
    <tr>
        <th class="text-left">Transform</th><th>Matrix</th><th>DoF</th><th class="text-left">Preserves</th><th>Icon</th>
    </tr>
    <tr>
        <td class="text-left">translation</td>
        <td>$\big[\, I \bigm| t \,\big]_{3 \times 4}$</td>
        <td>3</td>
        <td class="text-left">lengths, angles, orientation</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">rigid (Euclidean)</td>
        <td>$\big[\, R \bigm| t \,\big]_{3 \times 4}$</td>
        <td>6</td>
        <td class="text-left">lengths, angles, orientation</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">affine</td>
        <td>$\big[\, A \,\big]_{3 \times 4}$</td>
        <td>12</td>
        <td class="text-left">parallelism</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="8,4 22,4 16,20 2,20" /></svg></td>
    </tr>
    <tr>
        <td class="text-left">projective</td>
        <td>$\big[\, \tilde{H} \,\big]_{4 \times 4}$</td>
        <td>15</td>
        <td class="text-left">straight lines</td>
        <td><svg class="transform-icon" viewBox="0 0 24 24"><polygon points="6,6 20,2 20,22 6,18" /></svg></td>
    </tr>
</table>
</div>

---

## The 3D Graphics Rendering Pipeline

The vertices of a model pass through a sequence of coordinate spaces before they are drawn. Each step between spaces is a $4 \times 4$ matrix, except the division by $w$ that produces normalized device coordinates.

{{< figure src="/images/intro-to-rendering/coordinate_spaces_flow.svg" id="fig-coord-space-flow" caption="The coordinate spaces of the rendering pipeline, after Lengyel, Fig. 1.3." title="The Graphics Rendering Pipeline" alt="Flowchart: object space, world space, camera space, homogeneous clip space, window space" align="center" >}}

---

### Object Space

The vertices of a model are stored in **object space**, a coordinate system local to that model and used only by it.

<iframe src="/interactive/transformations/object_space.html" title="Object space demo" style="width:100%; max-width:800px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Each model is defined about its own origin.</p>

---

### World Space

**World space** is the global coordinate system that ties all object spaces together. The position, orientation and scale of each model are stored as an object-to-world transform $\mathbf{M}_\text{model}$ of the form $\mathbf{F}$.

When it is built from a scale $\mathbf{S}$, a rotation $\mathbf{R}$ and a translation $\mathbf{T}$, the usual order is

$$\mathbf{M}_\text{model} = \mathbf{T}\,\mathbf{R}\,\mathbf{S},$$

which applies $\mathbf{S}$ first and $\mathbf{T}$ last, because the vector is multiplied on the right. With the order reversed, the rotation and scale act on the translated position and the object moves around the world origin.

<iframe src="/interactive/transformations/world_space_steps.html" title="World space steps demo" style="width:100%; max-width:800px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Scale, then rotate, then translate. A different order gives a different result.</p>

<iframe src="/interactive/transformations/world_space.html" title="World space demo" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">All models placed in world space, together with the camera.</p>

---

### Camera Space

**Camera space**, also called eye space, is the coordinate system in which the camera lies at the origin, the $x$ axis points to the right and the $y$ axis points up. In OpenGL the $z$ axis points opposite to the viewing direction, so the camera looks down the $-z$ axis and the system is right-handed. (Direct3D points $z$ along the viewing direction, which gives a left-handed system.)

The world-to-camera transform $\mathbf{M}_\text{view}$ is the inverse of the camera's own object-to-world transform. Let the camera sit at the world-space point $\mathbf{E}$, with its $x$, $y$ and $z$ axes given by the columns of a rotation matrix $\mathbf{R}$. Its object-to-world transform is $\mathbf{T}(\mathbf{E})\,\mathbf{R}$, a rotation followed by a translation by $\mathbf{E}$. By the inverse of $\mathbf{F}$ above, with $\mathbf{R}^{-1} = \mathbf{R}^\mathrm{T}$,

$$\mathbf{M}_\text{view} = \left(\mathbf{T}(\mathbf{E})\,\mathbf{R}\right)^{-1} = \mathbf{R}^\mathrm{T}\,\mathbf{T}(-\mathbf{E}),$$

a translation by $-\mathbf{E}$ that moves the camera to the origin, followed by the rotation $\mathbf{R}^\mathrm{T}$ that lines its axes up with $x$, $y$ and $z$. The product $\mathbf{M}_\text{view}\mathbf{M}_\text{model}$, which takes object space directly to camera space, is the **model-view transformation**.

<iframe src="/interactive/transformations/view_space.html" title="Camera space demo" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">$\mathbf{M}_\text{view}$ applied to the whole scene: a translation that moves the camera to the origin, then a rotation that lines its axes up with $x$, $y$, $z$.</p>

The near and far plane distances $n$ and $f$ are positive. In camera space the near plane is $z = -n$ and the far plane is $z = -f$.

#### LookAt

A common way to place the camera is by its position $\mathbf{E}$, a point $\mathbf{C}$ it looks at, and an approximate up direction $\mathbf{U}$, usually $\langle 0, 1, 0 \rangle$. The camera's axes are

<div style="text-align: left">

$$
\begin{aligned}
&\mathbf{\color{#3b82f6}f} = \text{normalize}(\mathbf{C} - \mathbf{E}) && \text{(viewing direction)} \\
&\mathbf{\color{#ef4444}r} = \text{normalize}(\mathbf{\color{#3b82f6}f} \times \mathbf{U}) && \text{(camera } x \text{ axis)} \\
&\mathbf{\color{#22c55e}u} = \mathbf{\color{#ef4444}r} \times \mathbf{\color{#3b82f6}f} && \text{(camera } y \text{ axis)}
\end{aligned}
$$

</div>

and the camera $z$ axis is $-\mathbf{f}$. The vector $\mathbf{u}$ is recomputed because $\mathbf{U}$ is in general not perpendicular to $\mathbf{f}$. The three axes are orthonormal and $\mathbf{r} \times \mathbf{u} = -\mathbf{f}$, so the basis is right-handed.

<iframe src="/interactive/transformations/lookat.html" title="LookAt camera demo" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>

The camera's object-to-world transform has the columns $\mathbf{r}$, $\mathbf{u}$, $-\mathbf{f}$ and the translation $\mathbf{E}$. Its inverse, from $\mathbf{F}^{-1}$ with an orthogonal $\mathbf{M}$ ($\mathbf{M}^{-1} = \mathbf{M}^\mathrm{T}$), is

$$
\mathbf{M}_\text{view} = \begin{bmatrix}
\color{#ef4444}r_x & \color{#ef4444}r_y & \color{#ef4444}r_z & \color{#a855f7}-\mathbf{r} \cdot \mathbf{E} \\
\color{#22c55e}u_x & \color{#22c55e}u_y & \color{#22c55e}u_z & \color{#a855f7}-\mathbf{u} \cdot \mathbf{E} \\
\color{#3b82f6}-f_x & \color{#3b82f6}-f_y & \color{#3b82f6}-f_z & \color{#a855f7}\mathbf{f} \cdot \mathbf{E} \\
0 & 0 & 0 & \color{#a855f7}1
\end{bmatrix}
$$

---

### The View Frustum

The region of camera space that is visible is the **view frustum**, a truncated pyramid bounded by six planes. The **left**, **right**, **bottom** and **top** planes pass through the camera position and the edges of the screen. The **near** and **far** planes at distances $n$ and $f$ bound the visible depth.

{{< figure src="/images/intro-to-rendering/camera/frustum.svg" id="fig-view-frustum" caption="The view frustum in camera space. The near-plane rectangle at $z=-n$ has edges $x=l$, $x=r$, $y=b$, $y=t$." title="The View Frustum" alt="Perspective frustum showing near and far planes" align="center" >}}

#### Field of View

The **projection plane** is perpendicular to the viewing direction, at the distance $e$ from the camera where the left and right frustum planes meet it at $x = -1$ and $x = 1$. The distance $e$ is the **focal length**. It depends on the **horizontal field of view** angle $\alpha$ between the left and right planes:

$$e = \frac{1}{\tan(\alpha/2)}$$

A larger field of view gives a shorter focal length.

{{< figure src="/images/intro-to-rendering/camera/fov_horizontal.svg" id="fig-fov-horizontal" caption="Horizontal field of view $\alpha$, top view. The right edge of the near plane is $r = n/e = n\tan(\alpha/2)$." title="Horizontal Field of View" alt="Horizontal field of view diagram" align="center" >}}

The **aspect ratio** $a$ of the display is its height divided by its width ($0.75$ for $640 \times 480$). The bottom and top planes meet the projection plane at $y = \pm a$, so the **vertical field of view** is

$$\beta = 2\tan^{-1}(a/e)$$

{{< figure src="/images/intro-to-rendering/camera/fov_vertical.svg" id="fig-fov-vertical" caption="Vertical field of view $\beta$, side view. The top edge of the near plane is $t = an/e$." title="Vertical Field of View" alt="Vertical field of view diagram" align="center" >}}

Scaling this rectangle by $n/e$ moves it to the near plane. For a symmetric frustum the near-plane edges are

$$l = -\frac{n}{e}, \qquad r = \frac{n}{e}, \qquad b = -\frac{an}{e}, \qquad t = \frac{an}{e}$$

---

### Homogeneous Clip Space

The projection matrix maps the view frustum to a cube in **homogeneous clip space**, where primitives are clipped against the boundaries of the visible region. A camera-space point $\mathbf{P}$ becomes $\mathbf{P}_\text{clip} = \langle x_c, y_c, z_c, w_c \rangle$, and it is inside the visible region when

$$-w_c \le x_c \le w_c, \qquad -w_c \le y_c \le w_c, \qquad -w_c \le z_c \le w_c$$

Dividing by $w_c$ then gives **normalized device coordinates**, with $x$, $y$ and $z$ in $[-1, 1]$. Below, following Lengyel, $x'$, $y'$, $z'$ denote these normalized device coordinates.

---

#### Perspective Projection

A perspective projection maps $x$ and $y$ to the projection plane, so that geometry becomes smaller as its distance from the camera increases, while keeping depth information.

Let $\mathbf{P} = \langle P_x, P_y, P_z, 1 \rangle$ be a camera-space point inside the frustum. The OpenGL function `glFrustum()` takes the edges $l$, $r$, $b$, $t$ of the near-plane rectangle. The near plane is at $z = -n$, and the line from the camera to $\mathbf{P}$ meets it at

$$x = -\frac{n}{P_z}P_x, \qquad y = -\frac{n}{P_z}P_y$$

{{< figure src="/images/intro-to-rendering/camera/similar_triangles-1.svg" id="fig-similar-triangles-y" caption="Side view in the $y$-$z$ plane. Similar triangles give $y = -nP_y/P_z$." title="Projection onto the Near Plane: y" alt="Side-view similar triangles for perspective projection" align="center" >}}

{{< figure src="/images/intro-to-rendering/camera/similar_triangles-2.svg" id="fig-similar-triangles-x" caption="Top view in the $x$-$z$ plane. The same ratio gives $x = -nP_x/P_z$." title="Projection onto the Near Plane: x" alt="Top-view similar triangles for perspective projection" align="center" >}}

Points in the frustum satisfy $l \le x \le r$ and $b \le y \le t$ on the near plane. The linear maps to $[-1, 1]$ are

$$x' = (x - l)\frac{2}{r - l} - 1, \qquad y' = (y - b)\frac{2}{t - b} - 1,$$

and substituting $x$ and $y$ gives

$$
x' = \frac{2n}{r-l}\left(-\frac{P_x}{P_z}\right) - \frac{r+l}{r-l},
\qquad
y' = \frac{2n}{t-b}\left(-\frac{P_y}{P_z}\right) - \frac{t+b}{t-b}
$$

For depth, $P_z$ lies in $[-f, -n]$, and the map should send $-n \to -1$ and $-f \to 1$. This reflects the $z$ axis, so homogeneous clip space is left-handed. Reciprocals of $z$ are what get interpolated during rasterization, so the map is chosen as a function of $1/z$:

$$z' = \frac{A}{z} + B$$

The two conditions

$$-1 = \frac{A}{-n} + B, \qquad 1 = \frac{A}{-f} + B$$

give

$$A = \frac{2nf}{f - n}, \qquad B = \frac{f + n}{f - n}, \qquad z' = -\frac{2nf}{f-n}\left(-\frac{1}{P_z}\right) + \frac{f+n}{f-n}$$

Each of $x'$, $y'$, $z'$ contains a division by $-P_z$. The 3D point $\langle x', y', z' \rangle$ is therefore the 4D point

$$\mathbf{P}' = \langle -x'P_z,\, -y'P_z,\, -z'P_z,\, -P_z \rangle$$

after division by its $w$ coordinate, and each of its components is linear in the coordinates of $\mathbf{P}$:

$$
\begin{aligned}
-x'P_z &= \frac{2n}{r-l}P_x + \frac{r+l}{r-l}P_z \\
-y'P_z &= \frac{2n}{t-b}P_y + \frac{t+b}{t-b}P_z \\
-z'P_z &= -\frac{f+n}{f-n}P_z - \frac{2nf}{f-n}
\end{aligned}
$$

So $\mathbf{P}' = \mathbf{M}_\text{frustum}\mathbf{P}$, the point in homogeneous clip space ($\mathbf{P}_\text{clip}$ above), with

$$
\mathbf{M}_\text{frustum} =
\begin{bmatrix}
\color{#ef4444}\frac{2n}{r-l} & 0 & \frac{r+l}{r-l} & 0 \\
0 & \color{#22c55e}\frac{2n}{t-b} & \frac{t+b}{t-b} & 0 \\
0 & 0 & \color{#3b82f6}-\frac{f+n}{f-n} & -\frac{2nf}{f-n} \\
0 & 0 & \color{#a855f7}-1 & 0
\end{bmatrix}
$$

This is the matrix generated by `glFrustum()`; Ahn [[3]](#ref-3) derives the same matrix. Its last row puts $-P_z$ into the $w$ coordinate. For a symmetric frustum, substituting $l$, $r$, $b$, $t$ from the field of view gives

$$
\mathbf{M}_\text{frustum} =
\begin{bmatrix}
e & 0 & 0 & 0 \\
0 & e/a & 0 & 0 \\
0 & 0 & -\frac{f+n}{f-n} & -\frac{2nf}{f-n} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

<iframe src="/interactive/transformations/perspective_projection.htm" title="Perspective projection demo" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">$\mathbf{M}_\text{frustum}$ followed by division by $w$ maps the view frustum to the cube.</p>

---

#### Orthographic Projection

An orthographic projection, also called a parallel projection, has no perspective distortion. Camera-space points are moved to the projection plane along rays parallel to the viewing direction. The view volume is the box $[l, r] \times [b, t] \times [-f, -n]$.

{{< figure src="/images/intro-to-rendering/camera/orthographic.svg" id="fig-orthographic-volume" caption="The orthographic view volume is a box, so the projection is a scale and a translation on each axis." title="Orthographic View Volume" alt="Orthographic cuboid view volume" align="center" >}}

With no perspective, all three axes are mapped linearly, and $z$ is negated so that $-n \to -1$ and $-f \to 1$:

$$
\color{#ef4444}{x'} = \frac{2}{r-l}x - \frac{r+l}{r-l}, \qquad
\color{#22c55e}{y'} = \frac{2}{t-b}y - \frac{t+b}{t-b}, \qquad
\color{#3b82f6}{z'} = \frac{-2}{f-n}z - \frac{f+n}{f-n}
$$

In matrix form, $\mathbf{P}' = \mathbf{M}_\text{ortho}\mathbf{P}$ with

$$
\mathbf{M}_\text{ortho} =
\begin{bmatrix}
\color{#ef4444}\frac{2}{r-l} & 0 & 0 & -\frac{r+l}{r-l} \\
0 & \color{#22c55e}\frac{2}{t-b} & 0 & -\frac{t+b}{t-b} \\
0 & 0 & \color{#3b82f6}\frac{-2}{f-n} & -\frac{f+n}{f-n} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

This is the matrix generated by `glOrtho()`. The $w$ coordinate stays $1$, so no perspective division takes place.

<iframe src="/interactive/transformations/orthographic.html" title="Orthographic projection demo" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">$\mathbf{M}_\text{ortho}$ maps the box to the cube. Projected size does not depend on depth.</p>

---

### Normalized Device Coordinates

Dividing $\mathbf{P}_\text{clip} = \mathbf{M}_\text{frustum}\mathbf{P}$ by $w_c = -P_z$ gives the normalized device coordinates

$$
\begin{aligned}
\color{#ef4444}{x_\text{ndc}} &= -\frac{2n}{r-l}\frac{P_x}{P_z} - \frac{r+l}{r-l} \\
\color{#22c55e}{y_\text{ndc}} &= -\frac{2n}{t-b}\frac{P_y}{P_z} - \frac{t+b}{t-b} \\
\color{#3b82f6}{z_\text{ndc}} &= \frac{f+n}{f-n} + \frac{2nf}{(f-n)P_z}
\end{aligned}
$$

The $x$ and $y$ coordinates are divided by depth, so a point farther from the camera lands closer to the center. Writing the distance from the camera as $d = -P_z$, the depth is

$$\color{#3b82f6}{z_\text{ndc}}(d) = \frac{f+n}{f-n} - \frac{2nf}{(f-n)\,d}, \qquad z_\text{ndc}(n) = -1, \quad z_\text{ndc}(f) = 1$$

This is linear in $1/d$, not in $d$. Its derivative

$$\frac{\mathrm{d}\,z_\text{ndc}}{\mathrm{d}d} = \frac{2nf}{(f-n)\,d^2}$$

is large near the camera and small far away, so most of the depth range is spent close to the near plane. Points beyond the far plane map into $\left(1, \frac{f+n}{f-n}\right)$, points closer than the near plane map into $(-\infty, -1)$, and points behind the camera map to $\left(\frac{f+n}{f-n}, \infty\right)$.

{{< figure src="/images/intro-to-rendering/camera/ndc.svg" id="fig-ndc-cube" caption="After division by $w$, the view frustum occupies the cube $[-1, 1]^3$." title="Normalized Device Coordinates" alt="NDC cube with coordinates from -1 to 1" align="center" >}}

Evenly spaced planes in camera space are not evenly spaced in normalized device coordinates. Distant surfaces share a small part of the depth range and can fight for the same depth value (z-fighting). Moving the near plane farther out reduces this: for $f \gg n$, $z_\text{ndc} \approx 1 - 2n/d$, which depends mainly on $n/d$.

<iframe src="/interactive/transformations/perspective_divide.html" title="Depth mapping demo" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Evenly spaced depths in camera space and their values of $z_\text{ndc}$.</p>

---

### Window Space

The **viewport transformation** maps normalized device coordinates to the pixel coordinates covered by the viewport [[4]](#ref-4); after it, vertex positions are in **window space**. For

```cpp
glViewport(X, Y, W, H)
glDepthRange(N, F)
```

each axis is a linear map of $[-1, 1]$ onto $[X, X+W]$, $[Y, Y+H]$ and $[N, F]$:

$$
\color{#ef4444}{x_w} = \frac{W}{2}\color{#ef4444}{x_\text{ndc}} + X + \frac{W}{2},
\qquad
\color{#22c55e}{y_w} = \frac{H}{2}\color{#22c55e}{y_\text{ndc}} + Y + \frac{H}{2},
\qquad
\color{#3b82f6}{z_w} = \frac{F-N}{2}\color{#3b82f6}{z_\text{ndc}} + \frac{F+N}{2}
$$

As a matrix:

$$
\mathbf{M}_\text{viewport} =
\begin{bmatrix}
\frac{W}{2} & 0 & 0 & X+\frac{W}{2} \\
0 & \frac{H}{2} & 0 & Y+\frac{H}{2} \\
0 & 0 & \frac{F-N}{2} & \frac{F+N}{2} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

The default depth range is $[0, 1]$, and $z_w$ is the value stored in the depth buffer. The whole chain from object space to homogeneous clip space is

$$\mathbf{P}_\text{clip} = \mathbf{M}_\text{frustum}\,\underbrace{\mathbf{M}_\text{view}\,\mathbf{M}_\text{model}}_{\text{model-view}}\,\mathbf{P}_\text{object},$$

followed by division by $w$ and the viewport transformation.

<iframe src="/interactive/transformations/combine_space.html" title="Rendering pipeline demo" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">One vertex taken from object space to window space.</p>

---

## Two Ways to Render a Scene

Everything so far is **object-order** rendering: loop over the geometry and find the pixels each triangle covers. GPUs do this for millions of triangles per frame, which is why rasterization dominates real-time graphics.

**Image-order** rendering asks the opposite question: for each pixel, which surface does the camera see through it? We follow a ray from the camera through the pixel and find the first surface it hits. This is **ray casting**, and the rest of this post builds on it.

## Generating Primary Rays


### Ray
A ray is a half-line with an origin $\mathbf{o}$ and a direction $\mathbf{d}$. Its points are, for $t \ge 0$,
$$\mathbf{r}(t) = \mathbf{o} + t\mathbf{d}$$


{{< figure src="/images/intro-to-rendering/raytracing/ray.svg" id="fig-ray-definition" caption="A ray is defined by its origin $\mathbf{o}$ and a unit direction vector $\mathbf{d}$." title="Ray Definition" alt="Parametric ray diagram" align="center" width="50%" >}}


### Primary Ray Generation
For each pixel we generate one or more rays that start at the camera and pass through that pixel on the image plane. These are the **primary rays**.

{{< figure src="/images/intro-to-rendering/raytracing/primary_ray_generation.svg" id="fig-primary-ray-generation" caption="Primary ray generation for a pinhole camera. Each pixel center corresponds to one direction through the image plane." title="Primary Ray Generation" alt="Pinhole camera ray through a pixel center" align="center" >}}

The rays are generated in camera space and then rotated into world space. The camera is placed as in the [LookAt](#lookat) section, by its position $\mathbf{E}$, a point $\mathbf{C}$ it looks at, and an up direction $\mathbf{U}$, usually $\langle 0, 1, 0 \rangle$. Its axes are

<div style="text-align: left">

$$
\begin{aligned}
&\mathbf{\color{#3b82f6}f} = \text{normalize}(\mathbf{C} - \mathbf{E}) && \text{(viewing direction)} \\
&\mathbf{\color{#ef4444}r} = \text{normalize}(\mathbf{\color{#3b82f6}f} \times \mathbf{U}) && \text{(camera } x \text{ axis)} \\
&\mathbf{\color{#22c55e}u} = \mathbf{\color{#ef4444}r} \times \mathbf{\color{#3b82f6}f} && \text{(camera } y \text{ axis)}
\end{aligned}
$$

The camera $z$ axis is $-\mathbf{f}$. The rotation $\mathbf{R}$ from camera space to world space has these axes as its columns (it is `M_cam` in the code):

$$
\mathbf{R} = \begin{bmatrix}
{\color{#ef4444}r_x} & {\color{#22c55e}u_x} & {\color{#3b82f6}-f_x} \\
{\color{#ef4444}r_y} & {\color{#22c55e}u_y} & {\color{#3b82f6}-f_y} \\
{\color{#ef4444}r_z} & {\color{#22c55e}u_z} & {\color{#3b82f6}-f_z}
\end{bmatrix}
$$

A ray starts at $\mathbf{E}$, and its world-space direction is $\mathbf{R}$ times its camera-space direction. The camera-space direction comes from the pixel index, in four steps: 

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/raygen.svg" id="fig-coordinate-mapping" caption="The four steps of mapping discrete pixel indices $(ix, iy)$ to continuous physical coordinates $(px, py)$ on the camera's image plane." title="Coordinate Mapping Pipeline" alt="Four-step diagram of pixel to physical coordinate mapping" align="center" width="100%" >}}


#### Ray Generation Code
> <details>
> <summary style="cursor: pointer;">DrJit ray generation code</summary>
>
> A `Camera` class that generates one ray per pixel center. It uses [Dr.Jit](https://drjit.readthedocs.io/) [[14]](#ref-14), the array library behind the Mitsuba renderer. Here `fov` is the vertical field of view.
>
> ```python
> import math
> import drjit as dr
>
> # can switch between 'cuda' or 'llvm'
> from drjit.cuda import Float, Int, Array3f, Matrix3f
>
> class Ray:
>     def __init__(self, origin, direction):
>         self.o = origin
>         self.d = direction
>
> class Camera:
>     def __init__(self, pos, target, fov, aspect=None, H=800, W=800):
>         self.pos = Array3f(*pos)
>         self.target = Array3f(*target)
>         self.world_up = Array3f(0, 1, 0)
>         self.fov = fov
>         self.aspect = aspect if aspect is not None else W / H   # width / height: the reciprocal of a in the text
>         self.H = H
>         self.W = W
>         self.f = 1.0   # distance to the image plane (D in the text, not the far plane)
>
>     def lookAt(self):
>         forward = dr.normalize(self.target - self.pos)
>         right = dr.normalize(dr.cross(forward, self.world_up))
>         up = dr.normalize(dr.cross(right, forward))
>
>         # Matrix3f takes rows, so transpose to get r, u, -f as columns (R in the text)
>         M_cam = dr.transpose(Matrix3f(right, up, -forward))
>         return M_cam
>
>
>     def rays(self):
>         
>         # Generate 1D pixel indices
>         num_pixels = self.H * self.W
>         idx = dr.arange(Int, num_pixels)
>
>         # Generate the indices of pixels as (x, y)
>         x_ind = idx % self.W
>         y_ind = idx // self.W
>
>         # Scale to [0, 1] range with +0.5 to reach center 
>         # or change 0.5 to randomness in [0, 1] to jitter within pixel
>         x_center = (Float(x_ind) + 0.5) / self.W
>         y_center = (Float(y_ind) + 0.5) / self.H
>
>         xs = x_center * 2.0 - 1.0
>         ys = y_center * -2.0 + 1.0
>
>         # Image-plane size at distance f: tan(fov / 2) = (height / 2) / f
>         height = 2.0 * self.f * math.tan(math.radians(self.fov) / 2.0)
>         width = height * self.aspect
>
>         # Scale to [-width/2, width/2] x [-height/2, height/2]
>         px = xs * (width / 2.0)
>         py = ys * (height / 2.0)
>
>         # Create the Camera-to-World transformation matrix.
>         M_cam = self.lookAt()
>
>         # Pack the camera-space ray directions into an Array3f
>         dirs_cam = Array3f(px, py, -self.f)
>
>         # Rotate into world space
>         rd = M_cam @ dirs_cam
>         rd = dr.normalize(rd) # normalize the ray direction
>
>         ro = self.pos 
>
>         return Ray(ro, rd) # Convert to Ray class and return 
>
> ```
> </details>


In the GLSL shader the pixel coordinate comes from `gl_FragCoord`. Dividing by `u_resolution.y` makes $y$ run from $-0.5$ to $0.5$ and scales $x$ by the aspect ratio, so with the image plane at distance $D = 1$ (`f` in the code) the vertical field of view is $2\tan^{-1}(0.5) \approx 53^\circ$. The shader shows each world-space direction as a color, mapped from $[-1, 1]$ to $[0, 1]$.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

// Builds the Camera-to-World transformation matrix
mat3 lookAt(vec3 pos, vec3 target, vec3 world_up) {
    vec3 forward = normalize(target - pos);
    vec3 right   = normalize(cross(forward, world_up));
    vec3 up      = cross(right, forward);
    
    // GLSL matrices are column-major. 
    // We negate 'forward' because the camera looks down -Z in camera space.
    return mat3(right, up, -forward);
}

void main() {
    // y in [-0.5, 0.5]; x scaled by the aspect ratio
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Camera Setup
    // Place the camera at the origin, looking straight down the -Z axis
    vec3 ro = vec3(0.0, 0.0, 0.0);         // Ray Origin (Eye)
    vec3 target = vec3(0.0, 0.0, -1.0);    // Look at -Z
    vec3 world_up = vec3(0.0, 1.0, 0.0);
    
    mat3 M_cam = lookAt(ro, target, world_up);
    
    // Focal length (controls Field of View)
    float f = 1.0; 
    
    // Camera-space ray direction
    vec3 rd_cam = normalize(vec3(uv, -f)); 
    
    // Transform ray direction to World Space
    vec3 rd = M_cam * rd_cam;

    // Visualize direction: [-1,1] -> [0,1].
    fragColor = vec4(rd * 0.5 + 0.5, 1.0);
}
{{< /glsl >}}

> **A simpler camera for the remaining shaders**
>
> In the remaining shaders the camera is translated but not rotated, so it looks down $-z$, `M_cam` is the identity matrix and the ray direction can be built directly from the pixel coordinates:
> 
> ```glsl
> vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
> vec3 ro = vec3(0.0, 0.0, 3.0);       // Shifted back slightly, but not rotated
> vec3 rd = normalize(vec3(uv, -1.0)); // already a world-space direction
> ```

### Anti-Aliasing

One ray through the pixel center aliases hard edges into staircases ("jaggies"). A pixel should show the average color over its area. Averaging $N$ rays through random positions inside the pixel is a Monte Carlo estimate of that average.

Let $(p_x, p_y)$ be the pixel center on the image plane at distance $D$, as computed in the ray generation code, and let $s$ be the size of one pixel there (`height / H` in the code). Sample $i$ moves the point by offsets $\delta_{x,i}$ and $\delta_{y,i}$ drawn uniformly from $[-s/2, s/2]$:

$$
\mathbf{d}_i = \mathbf{R}\;\mathrm{normalize}\langle p_x + \delta_{x,i},\; p_y + \delta_{y,i},\; -D \rangle,
\qquad
L_\text{pixel} \approx \frac{1}{N}\sum_{i=1}^{N} L(\mathbf{E}, \mathbf{d}_i)
$$

Here $L(\mathbf{E}, \mathbf{d}_i)$ is the radiance (color) returned by the ray with origin $\mathbf{E}$ and direction $\mathbf{d}_i$. Uniform offsets estimate the plain average over the pixel square, a box filter.

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/aa_jitter.svg" id="fig-aa-jitter" caption="Anti-aliasing perturbs sample positions inside the pixel instead of always shooting through the center." title="Perturbed Pixel Samples" alt="Pixel grid with jittered sample points" align="center" >}}

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/aliasing.svg" id="fig-aliasing-comparison" caption="Aliasing comparison: (Left) Original vector geometry, (Middle) Jagged aliasing from center-only sampling, (Right) Smooth anti-aliased result using jittered sub-pixel sampling." title="Aliasing Comparison" alt="Comparison of vector, aliased, and anti-aliased rendering" align="center" width="100%" >}}

Production renderers usually place these samples in a stratified or blue-noise pattern, or accumulate them over many frames. The shaders in this post use one ray through each pixel center.


## Geometry Representations and Intersections

How a ray is intersected with the scene depends on how the geometry is represented. Three common representations are:

- **Analytic primitives** such as spheres, planes and cylinders are given by equations. Their intersection with a ray usually has a closed-form solution. They are cheap to intersect but can only model simple shapes.
- **Triangle meshes** approximate any surface with flat triangles. Rasterizers draw them, and ray tracers intersect them with a ray-triangle test.
- **Signed distance functions (SDFs)** give, for every point in space, the distance to the nearest surface: positive outside the object, zero on the surface and negative inside. A ray is intersected with an SDF iteratively, by sphere tracing [[6]](#ref-6).

---

### 1. Ray-Sphere Intersection

{{< figure src="/images/intro-to-rendering/representation/sphere_intersection.svg" id="fig-sphere-intersection" caption="Ray-Sphere Intersection: Substituting the ray equation into the sphere's implicit equation yields a quadratic in $t$." title="Ray-Sphere Intersection" alt="Diagram showing ray intersecting a sphere at two points" align="center" >}}


A sphere is one of the simplest analytic primitives to intersect. It is defined by its center point ${\color{#109618}\mathbf{c}}$ and its radius ${\color{#990099}R}$. Any point $\mathbf{p}$ on the surface of the sphere satisfies the equation:

$$ \|\mathbf{p} - {\color{#109618}\mathbf{c}}\|^2 = {\color{#990099}R}^2 $$

A point on the ray, with origin ${\color{#3273F6}\mathbf{o}}$ and unit direction ${\color{#FF4B4B}\mathbf{d}}$, is

$$ \mathbf{p} = {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}} $$

Substituting the ray into the sphere equation gives

$$ \| ({\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}}) - {\color{#109618}\mathbf{c}} \|^2 = {\color{#990099}R}^2 $$

Let $\mathbf{q} = {\color{#3273F6}\mathbf{o}} - {\color{#109618}\mathbf{c}}$, the vector from the center to the ray origin. Writing the squared length as a dot product and expanding gives a quadratic equation in $t$:

$$ ({\color{#FF4B4B}\mathbf{d}} \cdot {\color{#FF4B4B}\mathbf{d}})t^2 + 2(\mathbf{q} \cdot {\color{#FF4B4B}\mathbf{d}})t + (\mathbf{q} \cdot \mathbf{q} - {\color{#990099}R}^2) = 0 $$

This is $At^2 + Bt + C = 0$ with
*   $A = {\color{#FF4B4B}\mathbf{d}} \cdot {\color{#FF4B4B}\mathbf{d}}$ (If our ray direction is normalized, $A = 1$)
*   $B = 2(\mathbf{q} \cdot {\color{#FF4B4B}\mathbf{d}})$
*   $C = \mathbf{q} \cdot \mathbf{q} - {\color{#990099}R}^2$

The roots are $t = \frac{-B \pm \sqrt{B^2 - 4AC}}{2A}$.
*   If the discriminant $B^2 - 4AC$ is negative, the ray misses the sphere.
*   If it is zero, the ray touches the sphere at one point.
*   If it is positive, the ray crosses the sphere at two points. The smallest positive root is the first visible hit. If only the larger root is positive, the ray starts inside the sphere.

With $A = 1$ and $b = B/2 = \mathbf{q} \cdot {\color{#FF4B4B}\mathbf{d}}$, the roots simplify to $t = -b \pm \sqrt{h}$ with $h = b^2 - C$, a quarter of the discriminant. The shader below uses this form.

The hit point is $\mathbf{p} = {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}}$, and the unit normal there is $\mathbf{n} = (\mathbf{p} - {\color{#109618}\mathbf{c}}) / {\color{#990099}R}$.


{{< figure src="/images/intro-to-rendering/representation/sphere_cases.svg" id="fig-sphere-cases" caption="The three cases, by the sign of $h$: the ray misses the sphere ($h < 0$), touches it ($h = 0$), or crosses it ($h > 0$)." title="Intersection Cases" alt="Diagram showing three rays: miss, grazing hit, and two hits" align="center" >}}


{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

// Returns the smallest positive t, or -1.0 on a miss. Also outputs the unit normal.
float intersectSphere(vec3 ro, vec3 rd, vec3 center, float radius, out vec3 normal) {
    vec3 q = ro - center;
    float b = dot(q, rd);                  // B / 2 (A = 1 because rd is normalized)
    float c = dot(q, q) - radius * radius; // C
    float h = b * b - c;                   // discriminant / 4
    if (h < 0.0) return -1.0;              // ray misses

    float t = -b - sqrt(h);                // nearer root
    if (t <= 0.0) t = -b + sqrt(h);        // ray starts inside the sphere
    if (t <= 0.0) return -1.0;             // sphere is behind the ray

    normal = (ro + t * rd - center) / radius;
    return t;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    vec3 center = vec3(0.0, 0.0, 0.0);
    float radius = 1.0;
    
    vec3 normal;
    float t = intersectSphere(ro, rd, center, radius, normal);
    
    vec3 col = vec3(0.05); // Background color
    if (t > 0.0) {
        // Map normal from [-1, 1] to [0, 1] for visualization
        col = normal * 0.5 + 0.5;
    }

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

### 2. Ray-Triangle Intersection (Möller-Trumbore)

Let a triangle have vertices ${\color{#FF9900}\mathbf{a}}$, ${\color{#0099C6}\mathbf{b}}$ and ${\color{#DD4477}\mathbf{c}}$. Any point $\mathbf{p}$ in its plane can be written with **barycentric coordinates** $(u, v)$:

$$ \mathbf{p}(u, v) = {\color{#FF9900}\mathbf{a}} + u({\color{#0099C6}\mathbf{b}} - {\color{#FF9900}\mathbf{a}}) + v({\color{#DD4477}\mathbf{c}} - {\color{#FF9900}\mathbf{a}}) $$

{{< figure src="/images/intro-to-rendering/representation/triangle_barycentric.svg" id="fig-triangle-barycentric" caption="Barycentric coordinates $(w, u, v)$ with $w = 1 - u - v$ are the weights of $\mathbf{a}$, $\mathbf{b}$ and $\mathbf{c}$, and equal the ratios of the sub-triangle areas." title="Barycentric Coordinates" alt="Triangle divided into three colored sub-areas representing barycentric weights" align="center" width="60%" >}}


With the edge vectors $\mathbf{e}_1 = {\color{#0099C6}\mathbf{b}} - {\color{#FF9900}\mathbf{a}}$ and $\mathbf{e}_2 = {\color{#DD4477}\mathbf{c}} - {\color{#FF9900}\mathbf{a}}$, the ray meets the plane of the triangle where

$$ {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}} = {\color{#FF9900}\mathbf{a}} + u\mathbf{e}_1 + v\mathbf{e}_2 $$

Moving the unknowns $t$, $u$, $v$ to the left gives three linear equations:

$$ \begin{bmatrix} -{\color{#FF4B4B}\mathbf{d}} & \mathbf{e}_1 & \mathbf{e}_2 \end{bmatrix} \begin{bmatrix} t \\ u \\ v \end{bmatrix} = {\color{#3273F6}\mathbf{o}} - {\color{#FF9900}\mathbf{a}} $$

Let $\mathbf{s} = {\color{#3273F6}\mathbf{o}} - {\color{#FF9900}\mathbf{a}}$, the vector from $\mathbf{a}$ to the ray origin. **Cramer's rule** solves the system with determinants. The determinant of the matrix with columns $\mathbf{x}$, $\mathbf{y}$, $\mathbf{z}$ is the scalar triple product $\det(\mathbf{x}, \mathbf{y}, \mathbf{z}) = \mathbf{x} \cdot (\mathbf{y} \times \mathbf{z})$, the signed volume of the parallelepiped they span. The solution is

$$ \begin{bmatrix} t \\ u \\ v \end{bmatrix} = \frac{1}{\det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{e}_1, \mathbf{e}_2)} \begin{bmatrix} \det(\mathbf{s}, \mathbf{e}_1, \mathbf{e}_2) \\ \det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{s}, \mathbf{e}_2) \\ \det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{e}_1, \mathbf{s}) \end{bmatrix} $$

{{< figure src="/images/intro-to-rendering/representation/triangle_intersection.svg" id="fig-triangle-intersection" caption="Möller-Trumbore: setting the ray equal to the triangle's plane and solving for $t$, $u$ and $v$ together." title="Ray-Triangle Intersection" alt="Diagram showing ray hitting a triangle with basis vectors and s-vector labeled" align="center" >}}

The **Möller-Trumbore algorithm** [[5]](#ref-5) evaluates these determinants with two cross products, using $\det(\mathbf{x}, \mathbf{y}, \mathbf{z}) = \mathbf{x} \cdot (\mathbf{y} \times \mathbf{z}) = \mathbf{y} \cdot (\mathbf{z} \times \mathbf{x})$:

1.  Let $\mathbf{g} = {\color{#FF4B4B}\mathbf{d}} \times \mathbf{e}_2$. The denominator becomes $\mathbf{e}_1 \cdot \mathbf{g}$. If this is $0$, the ray is parallel to the triangle.
2.  The $u$ coordinate becomes $u = (\mathbf{s} \cdot \mathbf{g}) / (\mathbf{e}_1 \cdot \mathbf{g})$.
3.  Let $\mathbf{k} = \mathbf{s} \times \mathbf{e}_1$. The $v$ coordinate becomes $v = ({\color{#FF4B4B}\mathbf{d}} \cdot \mathbf{k}) / (\mathbf{e}_1 \cdot \mathbf{g})$.
4.  The hit distance becomes $t = (\mathbf{e}_2 \cdot \mathbf{k}) / (\mathbf{e}_1 \cdot \mathbf{g})$.

The ray hits the triangle (its interior or an edge) if $u \ge 0$, $v \ge 0$, $u + v \le 1$ and $t > 0$. The plane's normal is never computed.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Möller-Trumbore Ray-Triangle Intersection
bool intersectTriangle(vec3 ro, vec3 rd, vec3 a, vec3 b, vec3 c, out float t, out vec3 bary) {
    vec3 e1 = b - a;
    vec3 e2 = c - a;
    vec3 g = cross(rd, e2);
    float det = dot(e1, g);

    // det near zero: the ray is parallel to the triangle's plane
    if (abs(det) < 0.0001) return false;

    float invDet = 1.0 / det;
    vec3 svec = ro - a;
    
    // Calculate u and test bounds
    float u = dot(svec, g) * invDet;
    if (u < 0.0 || u > 1.0) return false;

    vec3 k = cross(svec, e1);
    
    // Calculate v and test bounds
    float v = dot(rd, k) * invDet;
    if (v < 0.0 || u + v > 1.0) return false;

    // Calculate t
    t = dot(e2, k) * invDet;
    
    bary = vec3(1.0 - u - v, u, v);   // weights of a, b, c
    return t > 0.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    float wobble = 0.25 * sin(u_time * 2.0);
    vec3 a = vec3(-1.0, -0.7, 0.0);
    vec3 b = vec3( 1.0, -0.6, 0.0);
    vec3 c = vec3( wobble, 0.9, 0.0);

    float t;
    vec3 bary;
    vec3 col = vec3(0.05); // Background
    
    if (intersectTriangle(ro, rd, a, b, c, t, bary)) {
        col = bary; // Visualize barycentric coordinates directly as RGB
    }

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

### 3. Signed Distance Functions (SDFs)

A **signed distance function (SDF)** describes a surface *implicitly*: instead of storing vertices, it gives the distance from any point to the nearest surface.

Let $S \subset \mathbb{R}^3$ be a closed set (the solid object) with boundary surface $\partial S$. The signed distance function is the Euclidean distance from $\mathbf{p}$ to $\partial S$, with a sign that tells whether $\mathbf{p}$ is outside or inside:

$$
f(\mathbf{p}) = \begin{cases} 
+\min_{\mathbf{x} \in \partial S} \|\mathbf{p} - \mathbf{x}\| & \text{if } \mathbf{p} \text{ is outside } S \\
0 & \text{if } \mathbf{p} \text{ is on the surface } \partial S \\
-\min_{\mathbf{x} \in \partial S} \|\mathbf{p} - \mathbf{x}\| & \text{if } \mathbf{p} \text{ is inside } S 
\end{cases}
$$

The surface is the zero level set $\partial S = \{\mathbf{p} \in \mathbb{R}^3 \mid f(\mathbf{p}) = 0\}$.

If $f(\mathbf{p}) = d > 0$, the sphere of radius $d$ around $\mathbf{p}$ contains no surface. A ray can therefore advance by $d$ without passing through a surface, which is the idea behind sphere tracing.

{{< figure src="/images/intro-to-rendering/representation/sdf.svg" id="fig-sdf-visualization" caption="Sphere tracing: at each point the SDF value is the radius of an empty circle, so the ray can safely advance by that distance." title="Signed Distance Field" alt="SDF contour visualization" align="center" >}}

#### The Eikonal Equation and Lipschitz Continuity

An exact signed distance function satisfies the **eikonal equation**

$$ \|\nabla f(\mathbf{p})\| = 1 $$

everywhere except where the gradient is undefined (for example on the medial axis, the points with more than one nearest surface point). Moving one unit directly away from the surface increases $f$ by exactly one.

Operations such as non-uniform scaling, twisting or blending usually break this property. Sphere tracing stays safe as long as $f$ is **1-Lipschitz**:

$$ |f(\mathbf{p}) - f(\mathbf{q})| \le \|\mathbf{p} - \mathbf{q}\| $$

Then $f$ never overestimates the distance to the surface. If $\|\nabla f\| > 1$ somewhere, $f$ can overestimate it, and the ray can step through the surface and miss geometry. If $\|\nabla f\|$ is much smaller than 1, the steps are safe but short, and the ray needs many more of them.


#### Constructive Solid Geometry (CSG)

Shapes are combined with Boolean operations. Quilez lists SDFs for many 2D [[7]](#ref-7) and 3D [[8]](#ref-8) primitives, and the operators below. If $a = f_1(\mathbf{p})$ and $b = f_2(\mathbf{p})$ are the signed distances to two shapes, the **constructive solid geometry (CSG)** operations are:

```glsl
float opUnion(float a, float b) {
    return min(a, b);
}

float opIntersection(float a, float b) {
    return max(a, b);
}

float opSubtraction(float a, float b) {
    return max(a, -b);
}

float opSmoothUnion(float a, float b, float k) {
    k *= 4.0;
    float h = max(k - abs(a - b), 0.0);
    return min(a, b) - h * h * 0.25 / k;
}
```

*   **Union**: the nearer shape decides, so the distance is the minimum.
*   **Intersection**: a point is inside only if it is inside both shapes, so the larger value decides.
*   **Subtraction**: negating $b$ swaps the inside and outside of the second shape, then the two are intersected.
*   **Smooth union**: `min` has a crease where the two shapes meet. The smooth version blends the two distances with a quadratic wherever $|a - b| < 4k$, subtracting at most $k$ (at $a = b$). The result is no longer an exact distance near the blend, but it remains 1-Lipschitz.

Union is exact outside the shapes. Intersection and subtraction give a lower bound on the distance rather than the exact distance; a bound never overestimates the distance, which is enough for sphere tracing.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 fragColor;

// Signed distance to a 2D circle
float sdCircle(in vec2 p, in float r) {
    return length(p) - r;
}

void main() {
    // Pixel coordinates, y from -1 to 1
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    
    vec2 probe;
    
    // Without the mouse over the canvas, animate the probe
    if (u_mouse.x <= 0.0 && u_mouse.y <= 0.0) {
        probe = vec2(cos(u_time * 0.8) * 0.8, sin(u_time * 0.5) * 0.6);
    } else {
        // Map mouse pixel coordinates to normalized screen space
        probe = (2.0 * u_mouse - u_resolution.xy) / u_resolution.y;
    }

    // Evaluate the SDF for the current pixel
    float d = sdCircle(p, 0.5);
    
    // Outside blue, inside red (same colors as the figure)
    vec3 col = (d > 0.0) ? vec3(0.314, 0.627, 0.941) : vec3(0.922, 0.314, 0.235);

    // Darken toward the surface
    float decay = (d > 0.0) ? 3.0 : 4.0;
    col *= 1.0 - exp(-decay * abs(d));

    // Contour lines of constant distance
    col *= 0.85 + 0.15 * cos(150.0 * d);
    
    // Draw the exact surface (d = 0) as a white outline
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.01, abs(d)));

    // Probe point and its empty circle
    float d_probe = sdCircle(probe, 0.5);
    
    vec3 yellow = vec3(1.0, 0.941, 0.0);

    // Circle of radius |f(probe)|: it touches the surface but does not cross it
    col = mix(col, yellow, 1.0 - smoothstep(0.0, 0.005, abs(length(p - probe) - abs(d_probe)) - 0.0025));
    
    // Draw the yellow center point
    col = mix(col, yellow, 1.0 - smoothstep(0.0, 0.005, length(p - probe) - 0.015));

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

#### Calculating Normals for SDFs

An implicit surface stores no normals, but the normal at a surface point $\mathbf{p}$ is the direction in which $f$ increases fastest, the **gradient** $\nabla f(\mathbf{p})$. For an exact SDF the eikonal equation makes it a unit vector:

$$ \mathbf{n} = \nabla f(\mathbf{p}) = \begin{pmatrix} \frac{\partial f}{\partial \color{#ef4444}x} \\ \frac{\partial f}{\partial \color{#22c55e}y} \\ \frac{\partial f}{\partial \color{#3b82f6}z} \end{pmatrix} $$

Shaders approximate the gradient with finite differences. **Central differences** evaluate $f$ at a small offset $\varepsilon$ on either side along each axis (the common factor $1/2\varepsilon$ is removed by the normalization):

$$ \mathbf{n} \approx \mathrm{normalize}\! \begin{pmatrix} f(\mathbf{p} + \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) - f(\mathbf{p} - \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) \\ f(\mathbf{p} + \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) - f(\mathbf{p} - \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) \\ f(\mathbf{p} + \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) - f(\mathbf{p} - \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) \end{pmatrix} $$

This takes six evaluations of $f$. **Forward differences** reuse $f(\mathbf{p})$ and take four, at the cost of a less accurate estimate:

$$ \mathbf{n} \approx \mathrm{normalize}\! \begin{pmatrix} f(\mathbf{p} + \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) - f(\mathbf{p}) \\ f(\mathbf{p} + \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) - f(\mathbf{p}) \\ f(\mathbf{p} + \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) - f(\mathbf{p}) \end{pmatrix} $$

The estimate is normalized because finite differences, smooth blends and distortions all make its length differ from 1.

The shader below renders a torus by sphere tracing and computes its normals with forward differences.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// SDF for a Torus
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Scene SDF (Combines all objects)
float map(vec3 p) {
    // Rotate the point slightly over time for animation
    float s = sin(u_time);
    float c = cos(u_time);
    mat3 rotX = mat3(1, 0, 0, 0, c, -s, 0, s, c);
    mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
    
    vec3 pt = rotY * rotX * p;
    return sdTorus(pt, vec2(1.0, 0.4));
}

// Forward difference normal approximation
vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0);
    
    // Evaluate the SDF at the point and at small offsets
    float base = map(p);
    return normalize(vec3(
        map(p + h.xyy) - base,
        map(p + h.yxy) - base,
        map(p + h.yyx) - base
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    // Sphere Tracing loop
    float t = 0.0;
    float max_d = 20.0;
    
    vec3 col = vec3(0.05); // Background
    
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        
        // Close enough to the surface: a hit
        if(abs(d) < 0.001) {
            vec3 n = calcNormal(p);
            // Map normal to [0,1] range for visualization
            col = n * 0.5 + 0.5;
            break;
        }
        // Too far: the ray missed
        if(t > max_d) break;
        
        // Advance by the distance to the nearest surface
        t += d;
    }

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

## Shading Models

Intersection gives the hit point and the surface normal there. A shading model gives the color of that point.

Light reaching a surface is partly absorbed and partly scattered. The **rendering equation** [[12]](#ref-12) describes the light leaving a point:

$$ L_o(\mathbf{x}, \boldsymbol{\omega}_o) = \underbrace{L_e(\mathbf{x}, \boldsymbol{\omega}_o)}_{\text{Emitted Radiance}} + \underbrace{\int_{\Omega} L_i(\mathbf{x}, \boldsymbol{\omega}_i) f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) (\mathbf{n} \cdot \boldsymbol{\omega}_i) \, d\boldsymbol{\omega}_i}_{\text{Reflected Radiance}} $$

The radiance $L_o$ leaving $\mathbf{x}$ in direction $\boldsymbol{\omega}_o$ is the emitted radiance $L_e$ plus the incoming radiance $L_i$ reflected toward $\boldsymbol{\omega}_o$, integrated over the hemisphere $\Omega$ above the surface. The **bidirectional reflectance distribution function (BRDF)** $f_s$ describes how the material reflects light, and the factor $\mathbf{n} \cdot \boldsymbol{\omega}_i$ is Lambert's cosine law.

$L_i$ at one point is the $L_o$ of other points, so the equation is recursive and has no closed-form solution for real scenes. Real-time graphics therefore uses simpler empirical models that consider only the light arriving directly from the light sources. Whitted's ray tracer [[11]](#ref-11) combined such a local model with traced shadow, reflection and refraction rays.

> **Gamma correction:** lighting is computed in linear units, but displays expect values encoded with a power curve. The shaders below raise the final color to the power $1/2.2$, an approximation of the sRGB encoding.

### Light Sources and Attenuation

Three common kinds of light source are:
*   **Directional lights** are infinitely far away, like the sun. All rays are parallel and the intensity does not change with distance.
*   **Point lights** emit equally in all directions from a point.
*   **Spot lights** emit from a point into a cone.

For point and spot lights, the light arriving at a surface falls off with the square of the distance $d$. For artistic control, renderers often use constant ($k_c$), linear ($k_l$) and quadratic ($k_q$) terms instead:

$$ I_{attenuated} = \frac{1}{k_c + k_l d + k_q d^2} I_{source} $$

### The Phong Reflection Model

The **Phong reflection model** [[9]](#ref-9) is an empirical model with three terms: **ambient**, **diffuse** and **specular**.

{{< figure src="/images/intro-to-rendering/lighting/sphere_lighting.svg" id="fig-phong-components" caption="The terms of the Phong reflection model: ambient (left), diffuse (middle) and specular (right)." title="Phong Shading Components" alt="Three spheres showing ambient, diffuse, and specular components" align="center" width="100%" >}}

#### 1. Ambient Light
Light also arrives indirectly, after bouncing off other surfaces. Instead of computing it, the ambient term adds a constant amount, so that surfaces facing away from the light are not black.

$$
L_a = k_a I_a
$$

$I_a$ is the ambient light intensity and $k_a$ the material's ambient coefficient.

#### 2. Lambertian Diffuse
A matte (Lambertian) surface, like chalk, reflects light equally in all directions, so its brightness does not depend on the viewer.

It does depend on the angle of the incoming light. A beam that hits the surface at an angle spreads over a larger area, so less light arrives per unit area. By Lambert's cosine law the light received is proportional to $\cos\theta = \mathbf{n} \cdot {\color{#FF9800}\mathbf{l}}$, where $\mathbf{n}$ is the unit normal and ${\color{#FF9800}\mathbf{l}}$ the unit vector toward the light:

$$
L_d = k_d I_d \max(0, \mathbf{n}\cdot{\color{#FF9800}\mathbf{l}})
$$

The clamp at zero removes light that arrives from behind the surface.

#### 3. Specular Highlights
Smooth surfaces, like polished metal or plastic, also show **specular highlights**, bright spots where light is reflected mostly in one direction. Where they appear depends on the viewer.

A mirror reflects light along the reflection vector ${\color{#4CAF50}\mathbf{r}}$. Projecting ${\color{#FF9800}\mathbf{l}}$ onto $\mathbf{n}$ gives $(\mathbf{n} \cdot {\color{#FF9800}\mathbf{l}})\mathbf{n}$, and mirroring ${\color{#FF9800}\mathbf{l}}$ about the normal gives

$$
{\color{#4CAF50}\mathbf{r}} = 2(\mathbf{n} \cdot {\color{#FF9800}\mathbf{l}})\mathbf{n} - {\color{#FF9800}\mathbf{l}}
$$

A glossy surface reflects light into a lobe around ${\color{#4CAF50}\mathbf{r}}$. Phong models the falloff with the angle $\phi$ between ${\color{#4CAF50}\mathbf{r}}$ and the unit vector ${\color{#2196F3}\mathbf{v}}$ toward the viewer by a power of its cosine:

$$
L_s = k_s I_s \max(0, {\color{#4CAF50}\mathbf{r}} \cdot {\color{#2196F3}\mathbf{v}})^\alpha
$$

The exponent $\alpha$ is the **shininess**. Small values (around 5 to 10) give a broad highlight, large values (100 to 200) a small, sharp one. The specular term is usually set to zero where $\mathbf{n} \cdot {\color{#FF9800}\mathbf{l}} \le 0$, since the surface then faces away from the light; the widgets below do this.

{{< figure src="/images/intro-to-rendering/lighting/phong.svg" id="fig-phong-vectors" caption="The vectors of the Phong model: ${\color{#FF9800}\mathbf{l}}$ mirrored about $\mathbf{n}$ gives ${\color{#4CAF50}\mathbf{r}}$, which is compared with ${\color{#2196F3}\mathbf{v}}$." title="Phong Vectors" alt="Vectors for Phong reflection model" align="center" width="500px" >}}

Together:

$$
L = \underbrace{k_a I_a}_{\text{Ambient}} + \underbrace{k_d I_d \max(0,\mathbf{n}\cdot{\color{#FF9800}\mathbf{l}})}_{\text{Diffuse}} + \underbrace{k_s I_s \max(0,{\color{#4CAF50}\mathbf{r}}\cdot{\color{#2196F3}\mathbf{v}})^\alpha}_{\text{Specular}}
$$

<iframe src="/interactive/phong_lighting_sphere.html" title="Phong lighting demo" style="width:100%; max-width:760px; height:440px; border:1px solid var(--border); background: var(--theme); display:block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">The Phong model on a sphere. Drag to move the light, hover to read the terms at a pixel, and switch to Blinn-Phong.</p>

<iframe src="/interactive/phong_steps.html" title="Phong reflection vector demo" width="100%" height="560" frameborder="0" style="border-radius:8px; border:1px solid var(--border); margin: 1.5rem auto; display: block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Constructing $\mathbf{r} = 2(\mathbf{n} \cdot \mathbf{l})\mathbf{n} - \mathbf{l}$ step by step.</p>

Below, the Phong model shades a test scene with two spheres on a checkerboard floor. Only local shading is computed, with no shadow or reflection rays, so the floor is lit even directly under the spheres.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 q = ro - c;
    float b = dot(q, rd);
    float disc = b * b - dot(q, q) + r * r;
    if (disc < 0.0) return -1.0;
    float t = -b - sqrt(disc);
    return t > 0.001 ? t : -1.0;
}

float hitPlane(vec3 ro, vec3 rd, float y) {
    float t = (y - ro.y) / rd.y;
    return t > 0.001 ? t : -1.0;
}

struct Hit { float t; vec3 n; vec3 col; };

Hit traceScene(vec3 ro, vec3 rd) {
    Hit best = Hit(1e20, vec3(0), vec3(0));
    float t;

    // Red sphere
    t = hitSphere(ro, rd, vec3(-0.8, 0.0, -1.0), 1.0);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(-0.8, 0, -1)), vec3(0.85, 0.15, 0.1));

    // Silver sphere
    t = hitSphere(ro, rd, vec3(1.0, -0.3, 0.0), 0.7);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(1, -0.3, 0)), vec3(0.9));

    // Floor
    t = hitPlane(ro, rd, -1.0);
    if (t > 0.0 && t < best.t) {
        vec3 p = ro + rd * t;
        float ck = mod(floor(p.x) + floor(p.z), 2.0);
        best = Hit(t, vec3(0, 1, 0), mix(vec3(0.3), vec3(0.7), ck));
    }
    return best;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    vec3 lightPos = vec3(3.0, 4.0, 2.0);

    Hit hit = traceScene(ro, rd);
    vec3 col = vec3(0.03, 0.04, 0.06);

    if (hit.t < 1e19) {
        vec3 p = ro + rd * hit.t;
        vec3 l = normalize(lightPos - p); // Light vector
        vec3 v = normalize(ro - p);       // View vector
        vec3 r = reflect(-l, hit.n);      // Reflection vector

        // Phong: Ambient + Diffuse + dot(r, v)^alpha
        vec3 ambient  = hit.col * 0.08;
        vec3 diffuse  = hit.col * max(dot(hit.n, l), 0.0);
        float spec    = pow(max(dot(r, v), 0.0), 48.0);
        col = ambient + diffuse + vec3(0.7) * spec;
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

### The Blinn-Phong Modification

Blinn [[10]](#ref-10) replaced ${\color{#4CAF50}\mathbf{r}} \cdot {\color{#2196F3}\mathbf{v}}$ with the angle between the normal and the **halfway vector**, the unit vector midway between ${\color{#FF9800}\mathbf{l}}$ and ${\color{#2196F3}\mathbf{v}}$:

$$
{\color{#9C27B0}\mathbf{h}} = \frac{{\color{#FF9800}\mathbf{l}} + {\color{#2196F3}\mathbf{v}}}{\|{\color{#FF9800}\mathbf{l}} + {\color{#2196F3}\mathbf{v}}\|}
$$

{{< figure src="/images/intro-to-rendering/lighting/blinn.svg" id="fig-blinn-vectors" caption="The Blinn-Phong vectors: the halfway vector ${\color{#9C27B0}\mathbf{h}}$ lies midway between ${\color{#FF9800}\mathbf{l}}$ and ${\color{#2196F3}\mathbf{v}}$." title="Blinn-Phong Vectors" alt="Vectors for Blinn-Phong modification" align="center" width="500px" >}}

The highlight is brightest when ${\color{#9C27B0}\mathbf{h}} = \mathbf{n}$, which happens exactly when ${\color{#4CAF50}\mathbf{r}} = {\color{#2196F3}\mathbf{v}}$. The specular term becomes $\max(0, \mathbf{n} \cdot {\color{#9C27B0}\mathbf{h}})^\beta$. When $\mathbf{n}$, ${\color{#FF9800}\mathbf{l}}$ and ${\color{#2196F3}\mathbf{v}}$ lie in one plane, the angle between $\mathbf{n}$ and ${\color{#9C27B0}\mathbf{h}}$ is half of $\phi$, so $\beta \approx 4\alpha$ gives a highlight of about the same size.

When the light and the viewer are both infinitely far away, ${\color{#FF9800}\mathbf{l}}$ and ${\color{#2196F3}\mathbf{v}}$ are constant, so ${\color{#9C27B0}\mathbf{h}}$ is computed once instead of once per pixel. This made the model cheaper than Phong's on early hardware.

<iframe src="/interactive/blinn_steps.html" title="Blinn-Phong halfway vector demo" width="100%" height="560" frameborder="0" style="border-radius:8px; border:1px solid var(--border); margin: 1.5rem auto; display: block;"></iframe>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Constructing $\mathbf{h}$ and comparing it with $\mathbf{n}$.</p>

The same scene shaded with Blinn-Phong. Only the specular line changes: $\max(0, \mathbf{n} \cdot \mathbf{h})^\beta$ with $\beta = 4\alpha = 192$ replaces $\max(0, \mathbf{r} \cdot \mathbf{v})^\alpha$ with $\alpha = 48$. The highlights have about the same size; at grazing angles the Blinn-Phong highlight is stretched rather than round.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 q = ro - c;
    float b = dot(q, rd);
    float disc = b * b - dot(q, q) + r * r;
    if (disc < 0.0) return -1.0;
    float t = -b - sqrt(disc);
    return t > 0.001 ? t : -1.0;
}

float hitPlane(vec3 ro, vec3 rd, float y) {
    float t = (y - ro.y) / rd.y;
    return t > 0.001 ? t : -1.0;
}

struct Hit { float t; vec3 n; vec3 col; };

Hit traceScene(vec3 ro, vec3 rd) {
    Hit best = Hit(1e20, vec3(0), vec3(0));
    float t;

    // Red sphere
    t = hitSphere(ro, rd, vec3(-0.8, 0.0, -1.0), 1.0);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(-0.8, 0, -1)), vec3(0.85, 0.15, 0.1));

    // Silver sphere
    t = hitSphere(ro, rd, vec3(1.0, -0.3, 0.0), 0.7);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(1, -0.3, 0)), vec3(0.9));

    // Floor
    t = hitPlane(ro, rd, -1.0);
    if (t > 0.0 && t < best.t) {
        vec3 p = ro + rd * t;
        float ck = mod(floor(p.x) + floor(p.z), 2.0);
        best = Hit(t, vec3(0, 1, 0), mix(vec3(0.3), vec3(0.7), ck));
    }
    return best;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    vec3 lightPos = vec3(3.0, 4.0, 2.0);

    Hit hit = traceScene(ro, rd);
    vec3 col = vec3(0.03, 0.04, 0.06);

    if (hit.t < 1e19) {
        vec3 p = ro + rd * hit.t;
        vec3 l = normalize(lightPos - p); // Light vector
        vec3 v = normalize(ro - p);       // View vector
        vec3 h = normalize(l + v);        // Halfway vector

        // Blinn-Phong: Ambient + Diffuse + dot(n, h)^beta
        vec3 ambient  = hit.col * 0.08;
        vec3 diffuse  = hit.col * max(dot(hit.n, l), 0.0);
        float spec    = pow(max(dot(hit.n, h), 0.0), 192.0);
        col = ambient + diffuse + vec3(0.7) * spec;
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

### Shading Paradigms: Gouraud vs. Phong

A rasterizer also has to decide *where* on a triangle the model is evaluated:

1. **Gouraud shading** evaluates it at the three vertices and interpolates the resulting colors across the triangle. It is cheap, but a highlight that falls inside a large triangle, away from its vertices, is lost.
2. **Phong shading** interpolates the normal across the triangle and evaluates the model at every pixel. Highlights inside triangles are kept and curved surfaces look smooth. Lengyel calls this per-pixel evaluation, done with the Blinn-Phong model, *Blinn-Phong shading* [[2]](#ref-2).

> The **Phong reflection model** (the formula above) and **Phong shading** (per-pixel evaluation with interpolated normals) are different things. The Phong reflection model can be evaluated with Gouraud shading.
>
> Linear interpolation between two unit normals gives a vector shorter than 1, so the interpolated normal is normalized again in the fragment shader.

### Limitations of Local Shading and Ambient Occlusion

The Phong and Blinn-Phong models look at one surface point at a time and know nothing about the rest of the scene. As a result:

*   **There are no cast shadows.** A sphere on a floor casts no shadow, because the model never checks whether anything blocks the light.
*   **There is no contact darkening** where two surfaces meet, such as under a sphere resting on a floor.
*   **The ambient term is constant.** Every point gets the same $k_a I_a$, however enclosed it is.

**Ambient occlusion (AO)** addresses the last two without computing global illumination. At each point it measures how much of the hemisphere above the surface is blocked by nearby geometry, weighted by the cosine:

$$
A(\mathbf{p}) = \frac{1}{\pi} \int_{\Omega} V(\mathbf{p}, \boldsymbol{\omega}) \, (\mathbf{n} \cdot \boldsymbol{\omega}) \, d\boldsymbol{\omega}
$$

$V(\mathbf{p}, \boldsymbol{\omega})$ is $1$ if direction $\boldsymbol{\omega}$ is unblocked and $0$ otherwise, and the factor $1/\pi$ makes $A = 1$ for a fully open hemisphere. The shading is multiplied by $A$, which darkens corners and contact regions.

**Screen-space ambient occlusion (SSAO)** estimates $V$ from the depth buffer around each pixel, as a post-process. A ray tracer can compute it directly with short occlusion rays.

For a sphere of radius $R$ whose center is at distance $d$ from $\mathbf{p}$, in a direction at angle $\theta$ to the normal, the blocked fraction of $A$ is exactly $\cos\theta \, (R/d)^2$, as long as the whole sphere is above the surface's tangent plane. The shader below subtracts this term for each sphere from $A = 1$ and multiplies all of the Phong terms by the result, which darkens the floor under the spheres.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 q = ro - c;
    float b = dot(q, rd);
    float disc = b * b - dot(q, q) + r * r;
    if (disc < 0.0) return -1.0;
    float t = -b - sqrt(disc);
    return t > 0.001 ? t : -1.0;
}

float hitPlane(vec3 ro, vec3 rd, float y) {
    float t = (y - ro.y) / rd.y;
    return t > 0.001 ? t : -1.0;
}

struct Hit { float t; vec3 n; vec3 col; };

Hit traceScene(vec3 ro, vec3 rd) {
    Hit best = Hit(1e20, vec3(0), vec3(0));
    float t;

    // Red sphere
    t = hitSphere(ro, rd, vec3(-0.8, 0.0, -1.0), 1.0);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(-0.8, 0, -1)), vec3(0.85, 0.15, 0.1));

    // Silver sphere
    t = hitSphere(ro, rd, vec3(1.0, -0.3, 0.0), 0.7);
    if (t > 0.0 && t < best.t)
        best = Hit(t, normalize(ro + rd*t - vec3(1, -0.3, 0)), vec3(0.9));

    // Floor
    t = hitPlane(ro, rd, -1.0);
    if (t > 0.0 && t < best.t) {
        vec3 p = ro + rd * t;
        float ck = mod(floor(p.x) + floor(p.z), 2.0);
        best = Hit(t, vec3(0, 1, 0), mix(vec3(0.3), vec3(0.7), ck));
    }
    return best;
}

// Occlusion by a sphere: cos(theta) * (R/d)^2 (exact while the sphere is above the tangent plane)
float sphereAO(vec3 p, vec3 n, vec3 c, float R) {
    vec3 v = c - p;
    float d = length(v);
    return max(0.0, dot(n, v / d)) * (R * R) / (d * d);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    vec3 lightPos = vec3(3.0, 4.0, 2.0);

    Hit hit = traceScene(ro, rd);
    vec3 col = vec3(0.03, 0.04, 0.06);

    if (hit.t < 1e19) {
        vec3 p = ro + rd * hit.t;
        vec3 l = normalize(lightPos - p); // Light vector
        vec3 v = normalize(ro - p);       // View vector
        vec3 r = reflect(-l, hit.n);      // Reflection vector

        // A = 1 minus the occlusion by each sphere
        float ao = 1.0;
        ao -= sphereAO(p, hit.n, vec3(-0.8, 0.0, -1.0), 1.0);
        ao -= sphereAO(p, hit.n, vec3(1.0, -0.3, 0.0), 0.7);
        ao = clamp(ao, 0.0, 1.0);

        // Combine with local Phong lighting
        vec3 ambient  = hit.col * 0.08 * ao;
        vec3 diffuse  = hit.col * max(dot(hit.n, l), 0.0) * ao;
        float spec    = pow(max(dot(r, v), 0.0), 48.0) * ao;
        col = ambient + diffuse + vec3(0.7) * spec;
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

Real shadows need shadow rays, which come next.

---

## Ray Tracing

The shading models above are **local**: they only use light that comes directly from the light sources. **Whitted ray tracing** [[11]](#ref-11) adds secondary rays. Where a primary ray hits a surface, new rays are traced toward the light, in the mirror direction and through transparent surfaces, recursively.

#### 1. Shadow Rays (Visibility Testing)
A **shadow ray** is traced from $\mathbf{p}$ in the direction ${\color{#FF9800}\mathbf{l}}$ of the light.
*   If it hits an object before reaching the light (${\color{#795548}t_{\text{hit}}} < {\color{#FF9800}t_{\text{light}}}$), the point is in shadow, and only the ambient term is used.
*   Rounding errors can make the ray hit the surface it starts on ("shadow acne"), so its origin is moved slightly along the normal, to $\mathbf{p} + \epsilon\mathbf{n}$.

{{< figure src="/images/intro-to-rendering/raytracing/shadow_ray.svg" id="fig-shadow-ray" caption="A shadow ray cast from point $\mathbf{p}$ toward the light source. If an occluder is found at distance ${\color{#795548}t_{\text{hit}}}$ that is less than the distance to the light ${\color{#FF9800}t_{\text{light}}}$, the point is in shadow." title="Shadow Ray Logic" alt="Diagram showing a shadow ray hit" align="center" width="600px" >}}

#### 2. Reflection Rays
For a mirror-like surface the reflected direction is computed as in the Phong model, with the view vector in place of the light vector:
$$ {\color{#4CAF50}\mathbf{r}} = 2(\mathbf{n} \cdot {\color{#2196F3}\mathbf{v}})\mathbf{n} - {\color{#2196F3}\mathbf{v}} $$
Here ${\color{#2196F3}\mathbf{v}} = -\mathbf{d}$ points from the surface back along the incoming ray. A new ray is traced from $\mathbf{p} + \epsilon\mathbf{n}$ in direction ${\color{#4CAF50}\mathbf{r}}$, and the color it returns is blended with the local shading according to the surface's reflectivity.

{{< figure src="/images/intro-to-rendering/raytracing/reflected_ray.svg" id="fig-reflected-ray" caption="A reflection ray traced from $\mathbf{p}$ in direction $\mathbf{r}$. The color it returns contributes to the color at $\mathbf{p}$." title="Reflection Ray" alt="Diagram showing a reflection ray" align="center" width="500px" >}}

#### 3. Refraction Rays (Transmission)
Light entering a transparent material such as glass changes direction. By **Snell's law**, the angle of incidence $\theta_L$ and the angle of transmission $\theta_T$ satisfy the following, where $\eta_L$ is the refractive index of the medium the light leaves and $\eta_T$ that of the medium it enters (about $1.0$ for air and $1.5$ for glass) [[2]](#ref-2):
$$ \eta_L \sin \theta_L = \eta_T \sin \theta_T $$

The transmitted direction ${\color{#9C27B0}\mathbf{t}}$ follows from splitting it into parts along and perpendicular to $\mathbf{n}$. With ${\color{#2196F3}\mathbf{v}} = -\mathbf{d}$ as above and $\cos\theta_L = \mathbf{n} \cdot {\color{#2196F3}\mathbf{v}}$,

$$
{\color{#9C27B0}\mathbf{t}} = \frac{\eta_L}{\eta_T}\left(-{\color{#2196F3}\mathbf{v}}\right) + \left(\frac{\eta_L}{\eta_T}\cos\theta_L - \cos\theta_T\right)\mathbf{n}
$$

where, by Snell's law,

$$
\cos\theta_T = \sqrt{1 - \left(\frac{\eta_L}{\eta_T}\right)^2\!\left(1 - \cos^2\theta_L\right)}
$$

If the value under the square root is negative, there is no transmitted ray: all the light is reflected. This is **total internal reflection**, and it can only happen when light goes from a denser to a less dense medium ($\eta_L > \eta_T$).


{{< figure src="/images/intro-to-rendering/raytracing/snells_law.svg" id="fig-snells-law" caption="Snell's law: light changes direction between media with refractive indices $\eta_L$ and $\eta_T$." title="Refraction and Snell's Law" alt="Diagram showing refraction" align="center" width="500px" >}}


The same scene with recursive ray tracing and an added glass sphere. Shadow rays now block the direct light, the chrome sphere reflects the scene, and rays refract through the glass sphere.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 q = ro - c;
    float b = dot(q, rd);
    float disc = b * b - dot(q, q) + r * r;
    if (disc < 0.0) return -1.0;
    float t = -b - sqrt(disc);
    if (t < 0.001) t = -b + sqrt(disc);
    return t > 0.001 ? t : -1.0;
}

float hitPlane(vec3 ro, vec3 rd, float y) {
    float t = (y - ro.y) / rd.y;
    return t > 0.001 ? t : -1.0;
}

// Same as GLSL reflect(): r = d - 2 (d.n) n, equal to 2 (n.v) n - v with v = -d
vec3 myReflect(vec3 d, vec3 n) {
    return d - 2.0 * dot(d, n) * n;
}

// t = eta (-v) + (eta cosL - cosT) n with v = -d, eta = eta_L / eta_T, and n on the side of v.
// The caller checks for total internal reflection (disc < 0) first.
vec3 myRefract(vec3 d, vec3 n, float eta) {
    float cosL = dot(-d, n);
    float disc = 1.0 - eta * eta * (1.0 - cosL * cosL);   // cosT^2
    return eta * d + (eta * cosL - sqrt(disc)) * n;
}

// ior > 0.0 marks a dielectric (glass); ior == 0.0 means opaque
struct Hit { float t; vec3 n; vec3 col; float refl; float ior; };

Hit traceScene(vec3 ro, vec3 rd) {
    Hit best = Hit(1e20, vec3(0), vec3(0), 0.0, 0.0);
    float t;

    // Red sphere
    t = hitSphere(ro, rd, vec3(-0.8, 0.0, -1.0), 1.0);
    if (t > 0.0 && t < best.t) { best = Hit(t, normalize(ro+rd*t - vec3(-0.8,0,-1)), vec3(0.85,0.15,0.1), 0.05, 0.0); }

    // Chrome sphere
    t = hitSphere(ro, rd, vec3(1.0, -0.3, 0.0), 0.7);
    if (t > 0.0 && t < best.t) { best = Hit(t, normalize(ro+rd*t - vec3(1.0,-0.3,0.0)), vec3(0.9), 0.8, 0.0); }

    // Glass sphere (ior = 1.5, like crown glass)
    t = hitSphere(ro, rd, vec3(0.1, 0.7, -2.2), 0.6);
    if (t > 0.0 && t < best.t) { best = Hit(t, normalize(ro+rd*t - vec3(0.1,0.7,-2.2)), vec3(0.95,0.98,1.0), 0.0, 1.5); }

    // Floor plane
    t = hitPlane(ro, rd, -1.0);
    if (t > 0.0 && t < best.t) {
        vec3 p = ro + rd * t;
        float ck = mod(floor(p.x) + floor(p.z), 2.0);
        best = Hit(t, vec3(0,1,0), mix(vec3(0.3), vec3(0.7), ck), 0.1, 0.0);
    }
    return best;
}

vec3 shade(Hit hit, vec3 p, vec3 rd) {
    vec3 lightPos = vec3(3.0, 4.0, 2.0);
    vec3 l = normalize(lightPos - p);
    vec3 v = -rd;

    // Shadow ray from p + eps n toward the light: in shadow, only the ambient term remains
    Hit sh = traceScene(p + hit.n * 0.01, l);
    float shadow = (sh.t < length(lightPos - p)) ? 0.0 : 1.0;

    float diff = max(dot(hit.n, l), 0.0) * shadow;
    float spec = pow(max(dot(myReflect(-l, hit.n), v), 0.0), 48.0) * shadow;
    return hit.col * 0.08 + hit.col * diff + vec3(0.7) * spec;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    vec3  col   = vec3(0.0);
    float atten = 1.0;

    // 4 bounces: enough for glass entry + exit + one more interaction each
    for (int bounce = 0; bounce < 4; bounce++) {
        Hit hit = traceScene(ro, rd);
        if (hit.t > 1e19) {
            col += atten * vec3(0.03, 0.04, 0.06);
            break;
        }
        vec3 p = ro + rd * hit.t;

        if (hit.ior > 0.0) {
            // Glass: refract, or reflect on total internal reflection.
            // cosL < 0 means the ray is inside the sphere, leaving it.
            float cosL  = dot(hit.n, -rd);
            bool inside = cosL < 0.0;
            vec3  faceN = inside ? -hit.n :  hit.n;  // always points against rd
            float eta   = inside ?  hit.ior : 1.0 / hit.ior;
            float cosL2 = abs(cosL);
            float disc  = 1.0 - eta * eta * (1.0 - cosL2 * cosL2);

            if (disc < 0.0) {
                // Total internal reflection
                ro = p + faceN * 0.001;
                rd = myReflect(rd, faceN);
            } else {
                // Refract into / out of the medium
                // t = eta (-v) + (eta cosL - cosT) n, as in the text
                ro = p - faceN * 0.001;  // nudge into the new medium
                rd = myRefract(rd, faceN, eta);
            }
            atten *= 0.97; // a little absorption; no Fresnel reflection in this simple model
        } else {
            // Opaque: local shading, blended with a reflection ray by the reflectivity
            col  += atten * (1.0 - hit.refl) * shade(hit, p, rd);
            atten *= hit.refl;
            if (atten < 0.01) break;
            ro = p + hit.n * 0.001;
            rd = myReflect(rd, hit.n);
        }
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

## Path Tracing

Whitted ray tracing gives sharp shadows and mirror reflections, but no diffuse interreflection, such as red light from a red wall reaching a white floor. **Path tracing** solves the rendering equation with Monte Carlo integration.

At each hit, a path tracer continues the path in a direction sampled at random over the hemisphere. Each path is a noisy estimate of the pixel's value, and the average over many paths per pixel converges to the solution of the rendering equation. Film renderers such as Arnold, RenderMan and Cycles are path tracers.

Monte Carlo integration, importance sampling and BRDFs are covered in the next post: [Importance Sampling and Path Guiding for Path Tracing](/posts/neural-importance-sampling-path-tracing/).


--- 

The widget below renders one scene four ways. Phong and Blinn-Phong use local shading only. Whitted ray tracing adds shadows and mirror reflections. Path tracing also includes diffuse interreflection (global illumination); its image gets less noisy as samples accumulate.

---

<iframe src="/interactive/cornell_box_modes.html" title="Cornell box mode comparison demo" style="width:100%; max-width:860px; height:860px; background: transparent; display:block; margin: 1.5rem auto;"></iframe>

---

## Sphere Tracing

**Sphere tracing** [[6]](#ref-6) is the form of ray marching that uses the SDF value as the step size. Instead of solving an equation for the hit, it evaluates $f$ at the current point on the ray, advances by that distance, and repeats:

$$ t_{k+1} = t_k + f({\color{#3273F6}\mathbf{o}} + t_k{\color{#FF4B4B}\mathbf{d}}) $$

The loop stops when $f$ falls below a small $\epsilon$ (a hit) or when $t$ exceeds a maximum distance (a miss):

```text
SphereTrace(ray origin ro, ray direction rd):
    t = 0
    for i in 1..maxSteps:
        p = ro + t * rd
        d = sceneSDF(p)
        if d < epsilon:
            return hit at p
        t = t + d
        if t > maxDistance:
            break
    return miss
```

For an exact SDF or any 1-Lipschitz bound, the steps never cross the surface. If the function may overestimate the distance, for example after a deformation, each step is multiplied by a factor below 1.

In the widget below, each circle is centered on a sample point and has the SDF value as its radius. The circles get smaller as the ray approaches a surface.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 fragColor;

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sceneSDF(vec2 p) {
    float c1 = sdCircle(p - vec2(-0.45, 0.10), 0.35);
    float c2 = sdCircle(p - vec2(0.42, -0.24), 0.22);
    float fl  = p.y + 0.72;
    return min(min(c1, c2), fl);
}

void main() {
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.x;

    // Fixed ray origin at the top center
    vec2 ro = vec2(0.0, 0.8);

    // The ray direction follows the mouse, or animates without it
    vec2 target = (u_mouse.x <= 0.0 && u_mouse.y <= 0.0)
        ? vec2(0.7 * cos(u_time * 0.55), 0.15 + 0.3 * sin(u_time * 0.8))
        : (2.0 * u_mouse - u_resolution.xy) / u_resolution.x;

    vec2 rd = normalize(target - ro);

    // --- SDF field visualization ---
    float d = sceneSDF(p);
    vec3 col = (d > 0.0) ? vec3(0.314, 0.627, 0.941) : vec3(0.922, 0.314, 0.235);
    float decay = (d > 0.0) ? 3.0 : 4.0;
    col *= 1.0 - exp(-decay * abs(d));
    col *= 0.85 + 0.15 * cos(150.0 * d);
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.01, abs(d)));

    // --- Ray line ---
    float rayLine = 1.0 - smoothstep(0.0, 0.012,
        length(p - (ro + clamp(dot(p - ro, rd), 0.0, 4.0) * rd)));
    col = mix(col, vec3(1.0), rayLine * 0.18);

    // --- Sphere tracing: one circle of radius f(p) per step (20 steps) ---
    vec2 marchP = ro;
    float t = 0.0;
    for (int i = 0; i < 20; i++) {
        float sd  = sceneSDF(marchP);
        float asd = abs(sd);

        float ring     = abs(length(p - marchP) - asd);
        float ringGlow = 1.0 - smoothstep(0.0, 0.008, ring - 0.003);
        float frac     = float(i) / 19.0;
        vec3  ringCol  = mix(vec3(0.3, 0.75, 1.0), vec3(1.0, 0.85, 0.2), frac);
        col = mix(col, ringCol, ringGlow * 0.9);

        float dot1 = 1.0 - smoothstep(0.0, 0.025, length(p - marchP) - 0.012);
        col = mix(col, vec3(1.0), dot1 * 0.9);

        if (sd < 0.001 || t > 4.0) break;
        t     += asd;
        marchP = ro + t * rd;
    }

    // --- Ray origin dot ---
    float roGlow = 1.0 - smoothstep(0.0, 0.03, length(p - ro) - 0.018);
    col = mix(col, vec3(1.0, 0.9, 0.3), roGlow);

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

The two-sphere scene from the shading section, rendered by sphere tracing, with shadow rays that are also sphere traced.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

// Scene defined via Signed Distance Functions
float map(vec3 p) {
    float s1 = length(p - vec3(-0.8, 0.0, -1.0)) - 1.0;  // Red sphere
    float s2 = length(p - vec3(1.0, -0.3, 0.0)) - 0.7;   // Silver sphere
    float fl = p.y + 1.0;                                  // Floor
    return min(min(s1, s2), fl);
}

// Normal from central differences
vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Shadow ray by sphere tracing: 0 if it hits something before the light, 1 otherwise
float calcShadow(vec3 ro, vec3 rd, float maxT) {
    float t = 0.02;
    for (int i = 0; i < 60; i++) {
        if (t > maxT) break;
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        t += h;
    }
    return 1.0;
}

// Identify which object was hit for coloring
vec3 getColor(vec3 p) {
    float s1 = length(p - vec3(-0.8, 0.0, -1.0)) - 1.0;
    float s2 = length(p - vec3(1.0, -0.3, 0.0)) - 0.7;
    float fl = p.y + 1.0;
    if (s1 < s2 && s1 < fl) return vec3(0.85, 0.15, 0.1);
    if (s2 < fl) return vec3(0.9);
    float ck = mod(floor(p.x) + floor(p.z), 2.0);
    return mix(vec3(0.3), vec3(0.7), ck);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    vec3 lightPos = vec3(3.0, 4.0, 2.0);

    vec3 col = vec3(0.03, 0.04, 0.06);

    // Sphere Tracing
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < 80; i++) {
        float d = map(ro + rd * t);
        if (d < 0.001) { hit = true; break; }
        if (t > 20.0) break;
        t += d;
    }

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 c = getColor(p);
        vec3 l = normalize(lightPos - p);
        vec3 v = normalize(ro - p);
        vec3 r = reflect(-l, n);

        float shadow = calcShadow(p + n * 0.01, l, length(lightPos - p));
        float diff = max(dot(n, l), 0.0) * shadow;
        float spec = pow(max(dot(r, v), 0.0), 48.0) * shadow;
        col = c * 0.08 + c * diff + vec3(0.7) * spec;
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

## References

1. <span id="ref-1"></span>Szeliski, Richard. *Computer Vision: Algorithms and Applications*. 2nd ed., Springer, 2022. [https://szeliski.org/Book/](https://szeliski.org/Book/).

2. <span id="ref-2"></span>Lengyel, Eric. *Mathematics for 3D Game Programming and Computer Graphics*. 3rd ed., Course Technology PTR, 2012.

3. <span id="ref-3"></span>Ahn, Song Ho. *"OpenGL Projection Matrix."* [https://www.songho.ca/opengl/gl_projectionmatrix.html](https://www.songho.ca/opengl/gl_projectionmatrix.html).

4. <span id="ref-4"></span>Ahn, Song Ho. *"OpenGL Viewport Transform."* [https://www.songho.ca/opengl/gl_viewport.html](https://www.songho.ca/opengl/gl_viewport.html).

5. <span id="ref-5"></span>Möller, Tomas, and Ben Trumbore. *"Fast, Minimum Storage Ray-Triangle Intersection."* *Journal of Graphics Tools*, 2(1), 21–28, 1997. [https://doi.org/10.1080/10867651.1997.10487468](https://doi.org/10.1080/10867651.1997.10487468).

6. <span id="ref-6"></span>Hart, John C. *"Sphere Tracing: A Geometric Method for the Antialiased Ray Tracing of Implicit Surfaces."* *The Visual Computer*, 12(10), 527–545, 1996.

7. <span id="ref-7"></span>Quilez, Inigo. *"2D Distance Functions."* [https://iquilezles.org/articles/distfunctions2d/](https://iquilezles.org/articles/distfunctions2d/).

8. <span id="ref-8"></span>Quilez, Inigo. *"3D Distance Functions."* [https://iquilezles.org/articles/distfunctions/](https://iquilezles.org/articles/distfunctions/).

9. <span id="ref-9"></span>Phong, Bui Tuong. *"Illumination for Computer Generated Pictures."* *Communications of the ACM*, 18(6), 311–317, 1975. [https://doi.org/10.1145/360825.360839](https://doi.org/10.1145/360825.360839).

10. <span id="ref-10"></span>Blinn, James F. *"Models of Light Reflection for Computer Synthesized Pictures."* *SIGGRAPH '77*, 192–198, 1977. [https://doi.org/10.1145/563858.563893](https://doi.org/10.1145/563858.563893).

11. <span id="ref-11"></span>Whitted, Turner. *"An Improved Illumination Model for Shaded Display."* *Communications of the ACM*, 23(6), 343–349, 1980. [https://doi.org/10.1145/358876.358882](https://doi.org/10.1145/358876.358882).

12. <span id="ref-12"></span>Kajiya, James T. *"The Rendering Equation."* *SIGGRAPH '86*, 143–150, 1986. [https://doi.org/10.1145/15922.15902](https://doi.org/10.1145/15922.15902).

13. <span id="ref-13"></span>Indian Institute of Science (IISc). *"E0 271: Graphics and Visualization."* [https://www.csa.iisc.ac.in/~vijayn/courses/Graphics/index.html](https://www.csa.iisc.ac.in/~vijayn/courses/Graphics/index.html).

14. <span id="ref-14"></span>Jakob, Wenzel, et al. *"Dr.Jit: A Just-In-Time Compiler for Differentiable Rendering."* [https://drjit.readthedocs.io/](https://drjit.readthedocs.io/).