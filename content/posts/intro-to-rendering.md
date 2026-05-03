---
author: ["Utkarsh Sharma"]
title: "Introduction to Rendering"
date: "2026-04-30"
description: "A gentle introduction to the 3D rendering pipeline — from geometric transformations to the pinhole camera shader."
summary: "From the translation problem to the MVP matrix and a live raymarching shader, built from first principles."
tags: ["Rendering", "Computer Graphics"]
categories: ["Computer Graphics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---


<!-- <span style="color:red;font-weight:700;font-size:1.05em">
This post is a work in progress and may be updated or expanded soon!
</span> -->

<!-- <div style="background: var(--code-bg, #f6f8fa); border-left: 3px solid #3b82f6; border-radius: 6px; padding: 1rem 1.25rem; margin: 1.5rem 0; font-size: 0.95rem;">
<strong>This series</strong><br>
<strong>① Introduction to Rendering</strong> (this post) — homogeneous coordinates, the MVP pipeline, ray generation, geometry intersections, and shading basics.<br>
② <a href="../path-tracing">Monte Carlo Path Tracing &amp; Importance Sampling</a> — the rendering equation, Monte Carlo integration, BRDFs, and physically based shading.<br>
③ <a href="../differentiable-rendering">Introduction to Differentiable Rendering</a> — gradients through the rendering pipeline, inverse rendering, and scene optimisation.<br>
④ <a href="../3d-reconstruction">3D Reconstruction: NeRF &amp; 3DGS</a> — neural radiance fields, 3D Gaussian splatting, and modern scene representations.
</div> -->


## Introduction to Rendering

What is rendering? At its core, rendering is the process of generating a 2D image from a 3D scene. The generated image can be realistic or stylized.

In computer graphics, there are two ways to render a 2D image from a 3D scene. The first is **rasterization**, where we take 3D objects and mathematically project them forward onto the 2D screen. The second is **ray tracing**, where we work backward, shooting virtual rays of light from the camera into the scene to see what they hit.

In this post, we will build both methods from the ground up. Instead of just skimming high-level ideas, we’ll dive into the real math and algorithms powering modern graphics engines.

Here is what we’ll cover in detail:
* **Homogeneous Coordinates & Transformations**
* **The Rasterization Pipeline** (Object → World → Camera → Clip → NDC → Screen)
* **Ray Tracing, Geometry, and Shading**
* **Path Tracing Basics** *(I have a separate, detailed post on this!)*
* **Signed Distance Functions (SDF) & Sphere Tracing**
* **Volume Rendering**


Along the way, I’ll provide the GLSL code for these concepts so you can see exactly how the math translates into practice.

---

## The Matrix Problem: Why Translation is Hard

The goal in real-time graphics is to express every geometric operation — scale, rotate, translate — as a single matrix multiplication, so the GPU can process millions of vertices with one unified instruction.

Rotation and scaling both work as $2 \times 2$ matrix multiplications:

$$ \begin{bmatrix} x' \\ y' \end{bmatrix} = \mathbf{M} \begin{bmatrix} x \\ y \end{bmatrix} $$

**Translation is the problem.** Moving a point by $(t_x, t_y)$ requires addition, not multiplication:

$$x' = x + t_x, \qquad y' = y + t_y$$

There is provably no $2 \times 2$ matrix that can do this — any linear map $\mathbf{M}$ must send the origin to itself, but translation moves it.

---

## Homogeneous Coordinates

The fix, developed in projective geometry, is to embed our 2D world in a higher-dimensional space by appending a coordinate $w$:

$$
(x,\, y) \;\longrightarrow\; \tilde{\mathbf{P}} = (x,\, y,\, 1)
$$

Every real 2D point lives on the hyperplane $w = 1$. To recover a 2D point from a homogeneous triple, we divide through by $w$:

$$\tilde{\mathbf{P}} = (\tilde{x},\, \tilde{y},\, \tilde{w}) \;\longrightarrow\; \mathbf{P} =\!\left(\frac{\tilde{x}}{\tilde{w}},\; \frac{\tilde{y}}{\tilde{w}}\right)$$

This division is called the **perspective divide**. Note: any scalar multiple $(\lambda x, \lambda y, \lambda)$ represents the *same* 2D point, because the $w$-divide cancels $\lambda$.

{{< figure src="/images/intro-to-rendering/homogeneous_coords.svg" caption="The homogeneous embedding: a 2D point $(x, y)$ corresponds to the ray through $(x, y, 1)$ in $\mathbb{R}^3$. Any point on this ray maps to the same 2D location." width="500px" align="center" >}}

**Why this enables translation.** In homogeneous coordinates, adding $(t_x, t_y)$ to a 2D point becomes a *shear* in 3D — a purely linear operation — representable by a $3 \times 3$ matrix multiplication. The dimension we added is doing real work.

**The key semantic distinction.** In 3D, homogeneous coordinates are $\langle x, y, z, w \rangle^T$ and the rule is:

| $w$ value | Interpretation | Affected by translation? |
|-----------|----------------|--------------------------|
| $w = 1$ | A **point** in space | Yes |
| $w = 0$ | A **direction** (free vector) | No — the translation column is nullified |

This is not arbitrary. A point has a position, so its homogeneous form gets $w=1$:

$$
\tilde{\mathbf{p}}_1 =
\begin{bmatrix} x_1 \\ y_1 \\ z_1 \\ 1 \end{bmatrix},
\qquad
\tilde{\mathbf{p}}_2 =
\begin{bmatrix} x_2 \\ y_2 \\ z_2 \\ 1 \end{bmatrix}
$$

But a vector is the difference between two points. For example, the displacement from $\mathbf{p}_2$ to $\mathbf{p}_1$ is:

$$
\tilde{\mathbf{v}} = \tilde{\mathbf{p}}_1 - \tilde{\mathbf{p}}_2 =
\begin{bmatrix} x_1-x_2 \\ y_1-y_2 \\ z_1-z_2 \\ 1-1 \end{bmatrix}=
\begin{bmatrix} v_x \\ v_y \\ v_z \\ 0 \end{bmatrix}=
\begin{bmatrix} \mathbf{v} \\ 0 \end{bmatrix}
$$

Here $\mathbf{v}=(v_x,v_y,v_z)^T$ is the ordinary 3D direction part, and $\tilde{\mathbf{v}}=(\mathbf{v},0)^T$ is its homogeneous form. So vectors naturally have $w=0$. This matches their meaning: a vector has length and direction, but no fixed location in space.

Now look at what a general affine transform does to a point:

$$
\begin{bmatrix}
\mathbf{M}_{3\times3} & \mathbf{t} \\
\mathbf{0}^T & 1
\end{bmatrix}
\begin{bmatrix}
\mathbf{p} \\ 1
\end{bmatrix}=
\begin{bmatrix}
\mathbf{M}\mathbf{p} + \mathbf{t} \\ 1
\end{bmatrix}
$$

The same transform applied to a direction vector gives:

$$
\begin{bmatrix}
\mathbf{M}_{3\times3} & \mathbf{t} \\
\mathbf{0}^T & 1
\end{bmatrix}
\begin{bmatrix}
\mathbf{v} \\ 0
\end{bmatrix}=
\begin{bmatrix}
\mathbf{M}\mathbf{v} + \mathbf{t}\cdot 0 \\ 0
\end{bmatrix}=
\begin{bmatrix}
\mathbf{M}\mathbf{v} \\ 0
\end{bmatrix}
$$

The translation column is multiplied by $w=0$, so it vanishes. That is exactly what we want: translating the entire coordinate system should move points, but it should not change a direction like "up", "forward", or "from this point to that point."

---

## 2D Transformations

We classify transformations by their **degrees of freedom (DoF)** and the geometric properties they **preserve**.

---

### 2D Translation — 2 DoF

$$x' = x + t_x, \qquad y' = y + t_y$$

{{< figure src="/images/intro-to-rendering/translate.svg" caption="Translation slides every point by the same vector $(t_x, t_y)$, leaving shapes unchanged." width="400px" align="center" >}}

Appending $w=1$ converts the addition into a $3 \times 3$ matrix multiply:

$$ \begin{bmatrix} \color{#ef4444}1 & \color{#22c55e}0 & \color{#3b82f6}t_x \\ \color{#ef4444}0 & \color{#22c55e}1 & \color{#3b82f6}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = \begin{bmatrix} x + t_x \\ y + t_y \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, area, orientation, parallelism, straight lines.
- **DoF**: 2 ($t_x$, $t_y$).

<object type="text/html" data="/interactive/transformations/graph.html?type=translation" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 2D Rigid / Euclidean — 3 DoF

A rigid transform is a rotation composed with a translation. It moves objects without any deformation at all — it is the most constrained non-trivial transform.

For a point at polar coordinates $(r, \phi)$, rotating by $\theta$ gives:

$$x' = x\cos\theta - y\sin\theta, \qquad y' = x\sin\theta + y\cos\theta$$

{{< figure src="/images/intro-to-rendering/rotation.svg" caption="Rotation about the origin by $\theta$, derived from the angle-addition identities." width="400px" align="center" >}}

The $2 \times 2$ rotation block $\mathbf{R}$ satisfies $\mathbf{R}^T\mathbf{R} = \mathbf{I}$ and $\det\mathbf{R} = 1$ — it is **orthonormal**. This is precisely what guarantees that lengths and angles are preserved.

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}\cos\theta & \color{#22c55e}-\sin\theta & \color{#3b82f6}0 \\ \color{#ef4444}\sin\theta & \color{#22c55e}\cos\theta & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

Adding a translation column gives the full rigid (Euclidean) transform.

- **Preserves**: lengths, angles, orientation.
- **DoF**: 3 (1 rotation angle $\theta$, 2 translations).

<object type="text/html" data="/interactive/transformations/graph.html?type=euclidean" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 2D Scaling — 2 DoF

$$x' = s_x \cdot x, \qquad y' = s_y \cdot y$$

{{< figure src="/images/intro-to-rendering/scaling.svg" caption="Scaling stretches or compresses relative to the origin. The axes can be scaled independently." width="400px" align="center" >}}

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}s_x & \color{#22c55e}0 & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}s_y & \color{#3b82f6}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

**What is and isn't preserved depends on whether the scale is uniform:**

- **Uniform scaling** ($s_x = s_y = s$): preserves angles, orientation, parallelism — but not lengths (everything scales by $s$).
- **Non-uniform scaling** ($s_x \neq s_y$): distorts angles. Only parallelism survives in general.

- **DoF**: 2 ($s_x$, $s_y$).

<object type="text/html" data="/interactive/transformations/graph.html?type=scaling" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 2D Affine — 6 DoF

An affine transform relaxes the orthonormality constraint on the $2 \times 2$ submatrix. The upper-left block is now *any* invertible $2 \times 2$ matrix. By SVD, every affine matrix decomposes into rotations and non-uniform scalings. The new operation introduced here is **shearing**.

$$ \begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}a_{11} & \color{#22c55e}a_{12} & \color{#3b82f6}t_x \\ \color{#ef4444}a_{21} & \color{#22c55e}a_{22} & \color{#3b82f6}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism (parallel lines stay parallel; lengths and angles can change).
- **DoF**: 6 (four entries of $\mathbf{A}$ + $t_x$ + $t_y$).

<object type="text/html" data="/interactive/transformations/graph.html?type=affine" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 2D Projective / Homography — 8 DoF

The final step: allow the *bottom row* of the matrix to take arbitrary values. The result is no longer affine — $w'$ is a non-trivial function of the input, so we must divide through by it to recover Cartesian coordinates.

$$ \begin{bmatrix} x' \\ y' \\ w' \end{bmatrix} = \begin{bmatrix} \color{#ef4444}h_{11} & \color{#22c55e}h_{12} & \color{#3b82f6}h_{13} \\ \color{#ef4444}h_{21} & \color{#22c55e}h_{22} & \color{#3b82f6}h_{23} \\ \color{#ef4444}h_{31} & \color{#22c55e}h_{32} & \color{#3b82f6}h_{33} \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}, \qquad x_{\text{out}} = \frac{x'}{w'}, \quad y_{\text{out}} = \frac{y'}{w'}$$

The $9$ matrix entries have only $8$ DoF because multiplying every entry by a non-zero scalar $\lambda$ produces the same map (the $w'$-divide cancels $\lambda$).

- **Preserves**: straight lines (but parallel lines can converge to a **vanishing point**).
- **DoF**: 8.

<object type="text/html" data="/interactive/transformations/graph.html?type=projective" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

### Custom 2D Transform

<object type="text/html" data="/interactive/transformations/graph.html?type=custom" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

## 3D Transformations

The extension to 3D is straightforward: use $4 \times 4$ matrices and four-component homogeneous coordinates $\langle x, y, z, w \rangle^T$. The point/direction semantic from the homogeneous coordinates section carries over directly: points use $w=1$, directions use $w=0$, and the same matrix form handles both correctly.

---

### 3D Translation — 3 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}1 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}t_x \\ \color{#ef4444}0 & \color{#22c55e}1 & \color{#3b82f6}0 & \color{#a855f7}t_y \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, orientation.
- **DoF**: 3.

<object type="text/html" data="/interactive/transformations/graph3d.html?type=translation" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 3D Rigid / Euclidean — 6 DoF

The $3 \times 3$ rotation block $\mathbf{R}$ is now orthonormal across all three axes ($\mathbf{R}^T\mathbf{R} = \mathbf{I}$, $\det\mathbf{R} = 1$), encoding pitch, yaw, and roll. It preserves lengths and angles for the same reason as in 2D: dot products are unchanged by an orthonormal matrix.

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}r_{11} & \color{#22c55e}r_{12} & \color{#3b82f6}r_{13} & \color{#a855f7}t_x \\ \color{#ef4444}r_{21} & \color{#22c55e}r_{22} & \color{#3b82f6}r_{23} & \color{#a855f7}t_y \\ \color{#ef4444}r_{31} & \color{#22c55e}r_{32} & \color{#3b82f6}r_{33} & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: lengths, angles, orientation.
- **DoF**: 6 (3 rotation angles, 3 translations).

<object type="text/html" data="/interactive/transformations/graph3d.html?type=rotation" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 3D Scaling — 3 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}s_x & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}s_y & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}s_z & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism. Angles preserved only if $s_x = s_y = s_z$.
- **DoF**: 3.

<object type="text/html" data="/interactive/transformations/graph3d.html?type=scaling" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 3D Affine — 12 DoF

$$ \begin{bmatrix} x' \\ y' \\ z' \\ 1 \end{bmatrix} = \begin{bmatrix} \color{#ef4444}a_{11} & \color{#22c55e}a_{12} & \color{#3b82f6}a_{13} & \color{#a855f7}t_x \\ \color{#ef4444}a_{21} & \color{#22c55e}a_{22} & \color{#3b82f6}a_{23} & \color{#a855f7}t_y \\ \color{#ef4444}a_{31} & \color{#22c55e}a_{32} & \color{#3b82f6}a_{33} & \color{#a855f7}t_z \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} $$

- **Preserves**: parallelism.
- **DoF**: 12 (nine free entries in $\mathbf{A}$ + three translations).

<object type="text/html" data="/interactive/transformations/graph3d.html?type=shear" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

---

### 3D Projective — 15 DoF

When the bottom row of the $4 \times 4$ matrix takes arbitrary values, the result is a general projective transform. After multiplying a point by this matrix, we must divide all components by the resulting $w'$ to recover Cartesian coordinates. This is the same perspective divide we saw in 2D homogeneous coordinates, now in 3D.

$$ \begin{bmatrix} x' \\ y' \\ z' \\ w' \end{bmatrix} = \begin{bmatrix} \color{#ef4444}h_{11} & \color{#22c55e}h_{12} & \color{#3b82f6}h_{13} & \color{#a855f7}h_{14} \\ \color{#ef4444}h_{21} & \color{#22c55e}h_{22} & \color{#3b82f6}h_{23} & \color{#a855f7}h_{24} \\ \color{#ef4444}h_{31} & \color{#22c55e}h_{32} & \color{#3b82f6}h_{33} & \color{#a855f7}h_{34} \\ \color{#ef4444}h_{41} & \color{#22c55e}h_{42} & \color{#3b82f6}h_{43} & \color{#a855f7}h_{44} \end{bmatrix} \begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}, \qquad x_{\text{out}} = \frac{x'}{w'},\ y_{\text{out}} = \frac{y'}{w'},\ z_{\text{out}} = \frac{z'}{w'}$$

The 16 entries have 15 DoF because scaling every entry by the same $\lambda$ yields the same map (the $w'$-divide cancels it). The **perspective projection matrix** we derive later in the pipeline section is one specific, carefully constructed member of this family — not a free 15-parameter matrix.

- **Preserves**: straight lines (parallel lines can converge at a vanishing point).
- **DoF**: 15.

<object type="text/html" data="/interactive/transformations/graph3d.html?type=projective" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

### Custom 3D Transform

<object type="text/html" data="/interactive/transformations/graph3d.html?type=custom" style="width:100%; max-width:500px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

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
    color: var(--mafs-text);
}
.transform-table th {
    border-top: 2px solid var(--mafs-text);
    border-bottom: 1px solid var(--mafs-text);
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
    border-bottom: 2px solid var(--mafs-text);
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

We now have the tools to trace a vertex all the way from an artist's model to a screen pixel. Every stage is a matrix multiplication; the GPU applies the same sequence to every vertex in parallel.

{{< figure src="/images/intro-to-rendering/coordinate_spaces_flow.svg" id="fig-coord-space-flow" caption="The MVP pipeline. Each arrow is a matrix multiplication; the final arrow is the hardware viewport transform." title="The Graphics Rendering Pipeline" alt="Flowchart: Object → World → Camera → Clip → NDC → Window Space" align="center" >}}

---

### Object Space (Local Space)

Each 3D model is authored in its own coordinate frame, with the origin typically at the model's geometric center. A cube, a sphere, and a character mesh all live in their own isolated local universes.

<object type="text/html" data="/interactive/transformations/object_space.html" style="width:100%; max-width:800px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Each object considers itself centered at its own origin, regardless of where it will end up in the scene.</p>

---

### World Space

We assemble the scene by applying each object's **Model Matrix** $\mathbf{M}_\text{model}$ — a rigid or affine transform encoding that object's scale, rotation, and position in the world.

The order matters: **Scale → Rotate → Translate** (applied right-to-left in matrix notation: $\mathbf{T} \cdot \mathbf{R} \cdot \mathbf{S}$). Translating before rotating would orbit the object around the world origin rather than spinning it in place.

<object type="text/html" data="/interactive/transformations/world_space_steps.html" style="width:100%; max-width:800px; height:400px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Scale → Rotate → Translate. Reversing this order produces different results.</p>

<object type="text/html" data="/interactive/transformations/world_space.html" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">All objects share one World Space. A camera object is placed here too, defining the viewpoint.</p>

---

### Camera Space (Eye Space / View Space)

To render the scene from the camera's point of view, we transform the entire world so that the camera sits at the origin, looking down the **$-Z$ axis**, with $+Y$ pointing up. This is **Camera Space** (also called Eye Space or View Space).

The transform that does this is the **View Matrix** $\mathbf{M}_\text{view}$ — a rigid Euclidean transform (rotation + translation). The camera itself doesn't move; the world is repositioned around it.

<object type="text/html" data="/interactive/transformations/view_space.html" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Translating the camera forward is mathematically identical to translating the entire world backward. The camera is always at the origin in Camera Space.</p>

#### Sign Convention Used Throughout This Post

We follow the **OpenGL right-handed Camera Space convention**:

- Camera at origin, looking down **$-Z$**.
- $+X$ points right, $+Y$ points up.
- **$n$ and $f$ are positive scalars** representing distances from the camera to the near and far planes. In Camera Space coordinates, those planes sit at $z = -n$ and $z = -f$.

Every projection matrix in the rest of this post uses this convention consistently.

#### Building the View Matrix: LookAt

Specifying the camera via Euler angles (yaw/pitch/roll) is error-prone and suffers from gimbal lock. The `LookAt` construction is more intuitive. It takes three inputs:

1. **Eye** $\mathbf{e}$: camera position in World Space.
2. **Target** $\mathbf{t}$: the point the camera looks at.
3. **World Up** $\mathbf{u}_\text{world}$: a reference "up" direction, typically $(0,1,0)$.

From these we build an orthonormal basis for the camera's local frame:

<div style="text-align: left">

$$
\begin{aligned}
&\mathbf{\color{#3b82f6}f} = \text{normalize}(\mathbf{t} - \mathbf{e}) && \text{({\color{#3b82f6}forward}, toward target)} \\
&\mathbf{\color{#ef4444}r} = \text{normalize}(\mathbf{\color{#3b82f6}f} \times \mathbf{u}_\text{world}) && \text{({\color{#ef4444}right})} \\
&\mathbf{\color{#22c55e}u} = \mathbf{\color{#ef4444}r} \times \mathbf{\color{#3b82f6}f} && \text{(true {\color{#22c55e}up}, reorthogonalized)}
\end{aligned}
$$

</div>

Geometrically, this is just "make three perpendicular arrows." The vector $\mathbf{f}$ points from the eye to the target, so it fixes where the camera looks. The cross product $\mathbf{f}\times\mathbf{u}_\text{world}$ gives a vector perpendicular to both the viewing direction and the approximate world-up direction; that is the camera's right axis. Crossing right with forward gives the corrected up axis. This last step matters because the supplied world-up vector is usually only a hint — if the camera is pitched or rolled, it is not exactly perpendicular to the viewing direction.

<object type="text/html" data="/interactive/transformations/lookat.html" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>

The View Matrix is the *inverse* of the camera's own World-Space transform. Because the rotation part is orthonormal, its inverse is its transpose. The translation inverts via dot products with the eye position:

$$
\mathbf{M}_\text{view} = \begin{bmatrix} 
\color{#ef4444}r_x & \color{#ef4444}r_y & \color{#ef4444}r_z & \color{#a855f7}-\mathbf{r} \cdot \mathbf{e} \\ 
\color{#22c55e}u_x & \color{#22c55e}u_y & \color{#22c55e}u_z & \color{#a855f7}-\mathbf{u} \cdot \mathbf{e} \\ 
\color{#3b82f6}-f_x & \color{#3b82f6}-f_y & \color{#3b82f6}-f_z & \color{#a855f7}\mathbf{f} \cdot \mathbf{e} \\ 
\color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 
\end{bmatrix}
$$

The third row negates $\mathbf{f}$ because the camera looks down $-Z$: we want $+Z$ in Camera Space to point *behind* the camera.

---

### Homogeneous Clip Space

After Camera Space, the **Projection Matrix** $\mathbf{M}_\text{proj}$ maps the view volume to a canonical cube, called **Clip Space**. The GPU then clips geometry against this cube. Two projection types are in common use.

One important OpenGL detail is that clipping happens **before** the perspective divide. A clip-space vertex $(x_c, y_c, z_c, w_c)$ survives only if:

$$-\color{#a855f7}{w_c} \le \color{#ef4444}{x_c} \le \color{#a855f7}{w_c}, \qquad -\color{#a855f7}{w_c} \le \color{#22c55e}{y_c} \le \color{#a855f7}{w_c}, \qquad -\color{#a855f7}{w_c} \le \color{#3b82f6}{z_c} \le \color{#a855f7}{w_c}$$

Only after this test does the GPU divide by $w_c$ to produce NDC:

$$\color{#ef4444}{x_\text{ndc}} = \frac{\color{#ef4444}{x_c}}{\color{#a855f7}{w_c}}, \qquad \color{#22c55e}{y_\text{ndc}} = \frac{\color{#22c55e}{y_c}}{\color{#a855f7}{w_c}}, \qquad \color{#3b82f6}{z_\text{ndc}} = \frac{\color{#3b82f6}{z_c}}{\color{#a855f7}{w_c}}$$

---

#### Orthographic Projection

An orthographic (parallel) projection has no perspective effect — objects do not appear smaller with distance. It is used for technical drawings, isometric games, and UI rendering.

The view volume is a **rectangular box** bounded by left ($l$), right ($r$), bottom ($b$), top ($t$), near ($n$), and far ($f$). In Camera Space the box spans $[l, r] \times [b, t] \times [-f, -n]$ (note: the near and far planes sit at *negative* $z$ because the camera looks down $-Z$, and $n, f > 0$).

{{< figure src="/images/intro-to-rendering/camera/orthographic.svg" id="fig-orthographic-volume" caption="An orthographic view volume is already a box. Projection only has to translate and scale it into the canonical NDC cube." title="Orthographic View Volume" alt="Orthographic cuboid view volume" align="center" >}}

The goal is to map this box to the **NDC cube** $[-1, 1]^3$. Each coordinate is just an affine map between two intervals:

$$
\begin{aligned}
\color{#ef4444}{x_\text{ndc}} &= \frac{2}{r-l}\color{#ef4444}{x} - \frac{r+l}{r-l} \qquad && [l, r] \to [-1, 1] \\
\color{#22c55e}{y_\text{ndc}} &= \frac{2}{t-b}\color{#22c55e}{y} - \frac{t+b}{t-b} \qquad && [b, t] \to [-1, 1] \\
\color{#3b82f6}{z_\text{ndc}} &= -\frac{2}{f-n}\color{#3b82f6}{z} - \frac{f+n}{f-n} \qquad && -n \to -1,\; -f \to +1
\end{aligned}
$$

The negative coefficient on $z$ is not a typo: in OpenGL Camera Space, the near plane is at $z=-n$ and the far plane is at $z=-f$, but OpenGL NDC stores near as $-1$ and far as $+1$.

The same result can be viewed geometrically as a translate-then-scale operation:

**Step 1 — Translate the box center to the origin.** The center is at $\bigl(\frac{r+l}{2},\, \frac{t+b}{2},\, \frac{-f-n}{2}\bigr)$:

$$ \mathbf{T} = \begin{bmatrix} \color{#ef4444}1 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}-\frac{r+l}{2} \\ \color{#ef4444}0 & \color{#22c55e}1 & \color{#3b82f6}0 & \color{#a855f7}-\frac{t+b}{2} \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}1 & \color{#a855f7}\frac{f+n}{2} \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} $$

**Step 2 — Scale to fit the NDC cube** (side length 2). The depth axis also gets negated so that $z = -n$ maps to $-1$ and $z = -f$ maps to $+1$ (i.e. near maps to NDC $-1$, far to NDC $+1$):

$$ \mathbf{S} = \begin{bmatrix} \color{#ef4444}\frac{2}{r-l} & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}\frac{2}{t-b} & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}\frac{-2}{f-n} & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} $$

Combining as $\mathbf{M}_\text{ortho} = \mathbf{S} \cdot \mathbf{T}$:

$$ \mathbf{M}_\text{ortho} = \begin{bmatrix} \color{#ef4444}\frac{2}{r-l} & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}-\frac{r+l}{r-l} \\ \color{#ef4444}0 & \color{#22c55e}\frac{2}{t-b} & \color{#3b82f6}0 & \color{#a855f7}-\frac{t+b}{t-b} \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}\frac{-2}{f-n} & \color{#a855f7}-\frac{f+n}{f-n} \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1 \end{bmatrix} $$

Because this is an affine transform, $w' = 1$ throughout — no perspective divide is needed. The output is already in NDC.

<object type="text/html" data="/interactive/transformations/orthographic.html" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">The orthographic projection maps the box-shaped view volume uniformly to the NDC cube. No perspective distortion: a cube 10 m away looks identical to one at 1 m.</p>

---

#### Perspective Projection

In a perspective projection, objects shrink as they recede — just as in a photograph. This is the correct model for a pinhole camera and the standard for 3D games and film.

Orthographic projection was a box-to-box mapping. Perspective projection has one extra job first: turn a frustum into a box while preserving the illusion that farther objects project smaller.

##### The View Frustum

The visible region is a **truncated pyramid** called the view frustum. It is bounded by six planes: near, far, left, right, top, and bottom. Everything outside the frustum is clipped; everything inside is rasterized.

{{< figure src="/images/intro-to-rendering/camera/frustum.svg" id="fig-view-frustum" caption="A perspective frustum in Camera Space. The near rectangle is at $z=-n$ with bounds $(l,r,b,t)$; the far rectangle is the same set of rays expanded out to $z=-f$." title="The Perspective View Frustum" alt="Perspective frustum showing near and far planes" align="center" >}}

The frustum parameters $l,r,b,t$ are measured on the **near plane**, not the far plane. Because every side of the frustum is a ray from the camera origin, the cross-section grows linearly with distance. At a positive camera distance $d=-z$:

$$
x \in \left[\frac{d}{n}l,\; \frac{d}{n}r\right],
\qquad
y \in \left[\frac{d}{n}b,\; \frac{d}{n}t\right]
$$

So at the far plane $(d=f)$, the bounds are scaled by $f/n$. This depth-dependent width is exactly what makes perspective projection non-affine.

##### Field of View and Focal Length

Field of view is a friendlier way to specify the same frustum. The **horizontal field of view** $\alpha$ controls the left/right opening, and the **vertical field of view** $\beta$ controls the top/bottom opening.

{{< figure src="/images/intro-to-rendering/camera/fov_horizontal.svg" id="fig-fov-horizontal" caption="Horizontal FoV. For a symmetric frustum, the half-width of the near plane is $r=n\tan(\alpha/2)$." title="Horizontal Field of View" alt="Horizontal field of view diagram" align="center" >}}

{{< figure src="/images/intro-to-rendering/camera/fov_vertical.svg" id="fig-fov-vertical" caption="Vertical FoV. The half-height of the near plane is $t=n\tan(\beta/2)$." title="Vertical Field of View" alt="Vertical field of view diagram" align="center" >}}

For a centered, symmetric frustum:

$$
r = n\tan(\alpha/2), \qquad l=-r
$$

$$
t = n\tan(\beta/2), \qquad b=-t
$$

If the viewport aspect ratio is $a=W/H$, then $a=r/t$. So if you start with horizontal FoV, $t=r/a$; if you start with vertical FoV, $r=at$.

The dimensionless focal scale used by the projection matrix is the near distance divided by the near-plane half-size:

$$
e_x=\frac{n}{r}=\frac{1}{\tan(\alpha/2)}, \qquad
e_y=\frac{n}{t}=\frac{1}{\tan(\beta/2)}
$$

Larger FoV means a smaller focal scale, which makes the image wider. These focal scales are **not** the near plane distance $n$ or far plane distance $f$; they are the $x$ and $y$ scale factors that appear in the symmetric projection matrix.

##### Similar Triangles: Why Perspective Divides by Depth

Take a Camera-Space point $(x,y,z)$ with $z<0$. Project it along the ray from the camera origin onto the near plane $z=-n$. The side and top views are the same argument in two different planes.

{{< figure src="/images/intro-to-rendering/camera/similar_triangles-1.svg" id="fig-similar-triangles-y" caption="Side view in the $yz$ plane. Similar triangles give $y_p=-ny/z$." title="Perspective Divide from Similar Triangles: Y" alt="Side-view similar triangles for perspective projection" align="center" >}}

{{< figure src="/images/intro-to-rendering/camera/similar_triangles-2.svg" id="fig-similar-triangles-x" caption="Top view in the $xz$ plane. The same ratio gives $x_p=-nx/z$." title="Perspective Divide from Similar Triangles: X" alt="Top-view similar triangles for perspective projection" align="center" >}}

The projected near-plane coordinates are:

$$
x_p = \frac{-n}{z}x = \frac{nx}{-z},
\qquad
y_p = \frac{-n}{z}y = \frac{ny}{-z}
$$

The sign is easy to trip over. Visible points have $z<0$, while $n$ is a positive distance. The distance from the camera to the point is therefore $-z$, not $z$. That is why the scale factor is $n/(-z)$: it is "near-plane distance divided by point distance."

That $-z$ in the denominator is the heart of perspective: as a point moves farther away, $|z|$ grows, and its projected coordinates move closer to the center.

##### Deriving the Perspective Projection Matrix

We build $\mathbf{M}_\text{proj}$ in two conceptual stages. This section constructs the clip-space coordinates; the next section performs the final perspective divide into NDC.

**Stage 1 — The "unhinging" matrix $\mathbf{M}_\text{persp}$.**

We want a matrix that turns the frustum into an orthographic box with bounds $[l,r]\times[b,t]\times[-f,-n]$ after the perspective divide. Start with this unknown-coefficient unhinging matrix:

$$
\mathbf{M}_\text{persp}(A,B)=
\begin{bmatrix}
\color{#ef4444}n & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}0 \\
\color{#ef4444}0 & \color{#22c55e}n & \color{#3b82f6}0 & \color{#a855f7}0 \\
\color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}A & \color{#a855f7}B \\
\color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}-1 & \color{#a855f7}0
\end{bmatrix}
$$

Applied to a Camera-Space point $(x,y,z,1)^T$, it produces:

$$
\begin{bmatrix}
\color{#ef4444}x_u \\
\color{#22c55e}y_u \\
\color{#3b82f6}z_u \\
\color{#a855f7}w_u
\end{bmatrix}=
\begin{bmatrix}
\color{#ef4444}nx \\
\color{#22c55e}ny \\
\color{#3b82f6}Az+B \\
\color{#a855f7}-z
\end{bmatrix}
$$

The similar-triangle result tells us what the first two divided coordinates must be:

$$
\frac{x_u}{w_u} = \frac{nx}{-z},
\qquad
\frac{y_u}{w_u} = \frac{ny}{-z}
$$

The first, second, and fourth rows above make that happen automatically:

$$
\color{#ef4444}{x_u}=nx,
\qquad
\color{#22c55e}{y_u}=ny,
\qquad
\color{#a855f7}{w_u}=-z
$$

Now we solve the remaining $z_u$ row. If we simply used $z_u=z$, the divide by $-z$ would destroy depth. Instead, keep the linear numerator from the unknown matrix:

$$
\color{#3b82f6}{z_u}=Az+B,
\qquad
\frac{\color{#3b82f6}{z_u}}{\color{#a855f7}{w_u}}=\frac{Az+B}{-z}
$$

The unhinged box should keep the near plane at $z=-n$ and the far plane at $z=-f$, because Stage 2 will reuse the orthographic matrix derived above. So impose:

$$
z=-n \Rightarrow \frac{Az+B}{-z}=-n,
\qquad
z=-f \Rightarrow \frac{Az+B}{-z}=-f
$$

These become:

$$
-An+B=-n^2,
\qquad
-Af+B=-f^2
$$

Solving gives:

$$A=n+f,\qquad B=nf$$

So the unhinging matrix is:

$$ \mathbf{M}_\text{persp} = \begin{bmatrix} \color{#ef4444}n & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}n & \color{#3b82f6}0 & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}n+f & \color{#a855f7}nf \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}-1 & \color{#a855f7}0 \end{bmatrix} $$

Multiplying a Camera-Space point $(x, y, z, 1)^T$ through gives:

$$\begin{bmatrix} \color{#ef4444}nx \\ \color{#22c55e}ny \\ \color{#3b82f6}(n+f)z + nf \\ \color{#a855f7}-z \end{bmatrix}$$

After dividing by $w_u=-z$, the frustum has become an orthographic box:

$$
\color{#ef4444}{x} \to \frac{nx}{-z},
\qquad
\color{#22c55e}{y} \to \frac{ny}{-z},
\qquad
\color{#3b82f6}{z} \to \frac{(n+f)z+nf}{-z}
$$

Check the depth endpoints:

$$
\color{#3b82f6}{z=-n} \Rightarrow \frac{(n+f)(-n)+nf}{n}=-n,
\qquad
\color{#3b82f6}{z=-f} \Rightarrow \frac{(n+f)(-f)+nf}{f}=-f
$$

This confirms that $\mathbf{M}_\text{persp}$ is correct for the two-stage construction. It is not the final OpenGL projection matrix yet; it is the projective warp that prepares the frustum for an orthographic remap.

**Stage 2 — Apply the orthographic matrix.**

The unhinging warp has produced the same box that the orthographic matrix expects: $[l,r]\times[b,t]\times[-f,-n]$. Therefore:

$$\mathbf{M}_\text{proj} = \mathbf{M}_\text{ortho} \cdot \mathbf{M}_\text{persp}$$

In the actual GPU pipeline these multiply into one matrix first, and the hardware performs one perspective divide afterward. The two-stage story is just a derivation tool.

Working the product out:

$$ \mathbf{M}_\text{proj} = \begin{bmatrix} \color{#ef4444}\frac{2n}{r-l} & \color{#22c55e}0 & \color{#3b82f6}\frac{r+l}{r-l} & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}\frac{2n}{t-b} & \color{#3b82f6}\frac{t+b}{t-b} & \color{#a855f7}0 \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}-\frac{f+n}{f-n} & \color{#a855f7}-\frac{2fn}{f-n} \\ \color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}-1 & \color{#a855f7}0 \end{bmatrix} $$

For a **symmetric** frustum ($r = -l$, $t = -b$), the off-diagonal entries in column 3 vanish and the matrix simplifies to the familiar `glm::perspective` form.

Substituting the horizontal FoV extents from above, and writing $e=e_x=1/\tan(\alpha/2)$, gives:

$$
\frac{n}{r} = \frac{1}{\tan(\alpha/2)} = e,
\qquad
\frac{n}{t} = \frac{a}{\tan(\alpha/2)} = ae
$$

So the horizontal FoV form has $e$ in the $x$ scale entry and $ae$ in the $y$ scale entry. If you start from a vertical FoV instead, $1/\tan(\beta/2)$ appears in the $y$ scale entry and is divided by the aspect ratio for $x$.

<object type="text/html" data="/interactive/transformations/perspective_projection.htm" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">The pyramid frustum warps into the NDC cube. Geometry far from the camera is compressed more than nearby geometry — this is foreshortening.</p>

> **Note on the interactive.** The widget above shows Camera-Space $z$-values as signed coordinates (near plane at $z = -3$, far plane at $z = -13$), consistent with the OpenGL convention and the derivation above.

---

### Normalized Device Coordinates (NDC)

After the perspective divide ($x_\text{ndc} = x'/w'$, $y_\text{ndc} = y'/w'$, $z_\text{ndc} = z'/w'$), all visible geometry occupies the unit cube $[-1, 1]^3$. This space is **device-independent**: NDC coordinates map to pixels the same way regardless of screen resolution.

For perspective projection, the divide is the moment where the clip-space bookkeeping becomes actual screen-like coordinates. From the matrix above, a Camera-Space point $(x,y,z,1)^T$ produces:

$$
\begin{aligned}
\color{#ef4444}{x_c} &= \frac{2n}{r-l}x + \frac{r+l}{r-l}z \\
\color{#22c55e}{y_c} &= \frac{2n}{t-b}y + \frac{t+b}{t-b}z \\
\color{#3b82f6}{z_c} &= -\frac{f+n}{f-n}z - \frac{2fn}{f-n} \\
\color{#a855f7}{w_c} &= -z
\end{aligned}
$$

The perspective divide turns those clip coordinates into:

$$
\begin{aligned}
\color{#ef4444}{x_\text{ndc}}
&= \frac{\color{#ef4444}{x_c}}{\color{#a855f7}{w_c}}
= \frac{\frac{2n}{r-l}x + \frac{r+l}{r-l}z}{-z}
= -\frac{2nx}{(r-l)z} - \frac{r+l}{r-l} \\
\color{#22c55e}{y_\text{ndc}}
&= \frac{\color{#22c55e}{y_c}}{\color{#a855f7}{w_c}}
= \frac{\frac{2n}{t-b}y + \frac{t+b}{t-b}z}{-z}
= -\frac{2ny}{(t-b)z} - \frac{t+b}{t-b} \\
\color{#3b82f6}{z_\text{ndc}}
&= \frac{\color{#3b82f6}{z_c}}{\color{#a855f7}{w_c}}
= \frac{-\frac{f+n}{f-n}z - \frac{2fn}{f-n}}{-z}
= \frac{f+n}{f-n} + \frac{2fn}{(f-n)z}
\end{aligned}
$$

The $x$ and $y$ equations are perspective foreshortening: both contain division by Camera-Space depth $z$. Since visible points have $z<0$, farther points have larger $|z|$, so their projected $x$ and $y$ values move closer to the center of the image.

The depth equation is the important one for the Z-buffer. If we write positive camera distance as $D=-z$, then:

$$\color{#3b82f6}{z_\text{ndc}}(D) = \frac{f+n}{f-n} - \frac{2fn}{(f-n)D}$$

This maps the near and far planes correctly:

$$
D=n \Rightarrow \color{#3b82f6}{z_\text{ndc}}=-1,
\qquad
D=f \Rightarrow \color{#3b82f6}{z_\text{ndc}}=+1
$$

But it is not linear in distance; it is linear in $1/D$. Its slope with respect to distance $D$ is:

$$\frac{\mathrm{d}\,\color{#3b82f6}{z_\text{ndc}}}{\mathrm{d}D} = \frac{2fn}{(f-n)D^2}$$

So the mapping changes rapidly near the camera and slowly far away. This is why the depth buffer gets much more precision near the near plane than near the far plane.

{{< figure src="/images/intro-to-rendering/camera/ndc.svg" id="fig-ndc-cube" caption="All visible geometry maps to the NDC cube after the perspective divide. Clipping tests become simple comparisons against $\pm 1$." title="Normalized Device Coordinates" alt="NDC cube with coordinates from -1 to 1" align="center" >}}

The interactive below shows this compression directly: evenly spaced planes in Camera Space bunch up after projection. Objects far away share a tiny slice of the depth range, causing **Z-fighting** (flickering between nearly coplanar surfaces). The practical fix is to push the near plane $n$ as far forward as your scene allows — halving $n$ roughly halves the Z-buffer precision available for distant objects.

<object type="text/html" data="/interactive/transformations/perspective_divide.html" style="width:100%; max-width:800px; height:500px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Five evenly-spaced depth planes in Camera Space become unevenly-spaced planes in NDC. The compression accelerates toward the far plane.</p>

---

### Window Space

The **Viewport Transform** maps NDC to pixel coordinates. This is another set of line maps. For:

```cpp
glViewport(X, Y, W, H)
glDepthRange(N, F)
```

the interval endpoints are:

$$
[-1, 1] \to [X, X+W],
\qquad
[-1, 1] \to [Y, Y+H],
\qquad
[-1, 1] \to [N, F]
$$

Solving $u_\text{out} = au_\text{ndc} + b$ for each axis gives:

$$
\color{#ef4444}{x_w} = \frac{W}{2}\color{#ef4444}{x_\text{ndc}} + X + \frac{W}{2},
\qquad
\color{#22c55e}{y_w} = \frac{H}{2}\color{#22c55e}{y_\text{ndc}} + Y + \frac{H}{2}
$$

$$
\color{#3b82f6}{z_w} = \frac{F-N}{2}\color{#3b82f6}{z_\text{ndc}} + \frac{F+N}{2}
$$

For the common default viewport origin $(X,Y)=(0,0)$ and depth range $[N,F]=[0,1]$, this reduces to:

$$\color{#ef4444}{x_\text{px}} = \frac{W}{2}(\color{#ef4444}{x_\text{ndc}} + 1), \qquad \color{#22c55e}{y_\text{px}} = \frac{H}{2}(\color{#22c55e}{y_\text{ndc}} + 1), \qquad \color{#3b82f6}{z_w} = \frac{\color{#3b82f6}{z_\text{ndc}}+1}{2}$$

As a homogeneous matrix, the full viewport transform is:

$$
\mathbf{M}_\text{viewport} =
\begin{bmatrix}
\color{#ef4444}\frac{W}{2} & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}X+\frac{W}{2} \\
\color{#ef4444}0 & \color{#22c55e}\frac{H}{2} & \color{#3b82f6}0 & \color{#a855f7}Y+\frac{H}{2} \\
\color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}\frac{F-N}{2} & \color{#a855f7}\frac{F+N}{2} \\
\color{#ef4444}0 & \color{#22c55e}0 & \color{#3b82f6}0 & \color{#a855f7}1
\end{bmatrix}
$$

The depth value $z_w$ is what the Z-buffer stores for depth testing during rasterization.

The full pipeline is the **MVP transform**:

$$\mathbf{v}_\text{clip} = \underbrace{\color{#3b82f6}{\mathbf{M}_\text{proj}}}_{\text{Projection}} \cdot \underbrace{\color{#22c55e}{\mathbf{M}_\text{view}} \cdot \color{#ef4444}{\mathbf{M}_\text{model}}}_{\text{Model-View}} \cdot \mathbf{v}_\text{object}$$

<object type="text/html" data="/interactive/transformations/combine_space.html" style="width:100%; max-width:800px; height:600px; border:1px solid var(--border); border-radius: 8px; margin: 1.5rem auto; background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">The complete MVP pipeline. Each stage is one matrix multiply on the GPU, applied to every vertex in parallel.</p>

---

## Two Ways to Render a Scene

Everything up to this point has been **object-space / rasterization** thinking: we iterate over geometry and ask where each triangle lands on the screen. The GPU does this in parallel for every vertex, clipping and filling pixels as it goes. It is extremely fast, which is why it dominates real-time graphics.

But there is a second, equally valid question you can ask: starting from a pixel on the screen, what does the camera actually see through it? This is **image-space / ray casting** thinking. Instead of pushing geometry forward into screen space, we pull a ray backward from the pixel into the scene and find whatever it hits first. The rest of this post covers the ray casting side.

## Generating Primary Rays

We will now follow a different approach to rendering. Instead of projecting objects into a 2D screen, we will use rays to find the pixel color. But before we start with the ray casting algorithm, we need to understand the basics of rays.

> For this section I will move away from OpenGL standard, where camera faces $-Z$ direction. Instead, camera will be facing $+Z$ direction.

### Ray
A ray is a parametric line defined by an origin $\mathbf{o}$ and a direction $\mathbf{d}$:
$$\mathbf{r}(t) = \mathbf{o} + t\mathbf{d}$$


{{< figure src="/images/intro-to-rendering/raytracing/ray.svg" id="fig-ray-definition" caption="A ray is defined by its origin $\mathbf{o}$ and a unit direction vector $\mathbf{d}$." title="Ray Definition" alt="Parametric ray diagram" align="center" width="50%" >}}


### Primary Ray Generation
Now that we know how to define a ray, for ray casting algorithms we will need to define a ray (or multiple rays) for a pixel. We can visualize the rays being generated from camera origin and passing through the image plane to the scene.  These rays are called primary rays. We will see how to render an image using these later, for now, we will focus on generating these rays.

{{< figure src="/images/intro-to-rendering/raytracing/primary_ray_generation.svg" id="fig-primary-ray-generation" caption="Primary ray generation for a pinhole camera. Each pixel center corresponds to one direction through the image plane." title="Primary Ray Generation" alt="Pinhole camera ray through a pixel center" align="center" >}}

I will assume that we have objects in the world space and then generate rays in camera (eye) space and transform them to world space (note how we are going from camera space to world space). For getting the transformation matrix, we again use the lookAt function.

1. **Eye** $\mathbf{e}$: camera position in World Space.
2. **Target** $\mathbf{t}$: the point the camera looks at.
3. **World Up** $\mathbf{u}_\text{world}$: a reference "up" direction, typically $(0,1,0)$.

From these we build an orthonormal basis for the camera's local frame:

<div style="text-align: left">

$$
\begin{aligned}
&\mathbf{\color{#3b82f6}f} = \text{normalize}(\mathbf{t} - \mathbf{e}) && \text{({\color{#3b82f6}forward}, toward target)} \\
&\mathbf{\color{#ef4444}r} = \text{normalize}(\mathbf{\color{#3b82f6}f} \times \mathbf{u}_\text{world}) && \text{({\color{#ef4444}right})} \\
&\mathbf{\color{#22c55e}u} = \mathbf{\color{#ef4444}r} \times \mathbf{\color{#3b82f6}f} && \text{(true {\color{#22c55e}up}, reorthogonalized)}
\end{aligned}
$$

$$
\mathbf{M}_{camera} = \begin{bmatrix}
\mathbf{\color{#ef4444}r}_x & \mathbf{\color{#22c55e}u}_x & \mathbf{\color{#3b82f6}f}_x \\
\mathbf{\color{#ef4444}r}_y & \mathbf{\color{#22c55e}u}_y & \mathbf{\color{#3b82f6}f}_y \\
\mathbf{\color{#ef4444}r}_z & \mathbf{\color{#22c55e}u}_z & \mathbf{\color{#3b82f6}f}_z
\end{bmatrix}
$$

We will use this $M_{camera}$ matrix to transform these rays into the world space. For generating the rays we will use the pixel index. 

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/raygen.svg" id="fig-coordinate-mapping" caption="The four steps of mapping discrete pixel indices $(ix, iy)$ to continuous physical coordinates $(px, py)$ on the camera's image plane." title="Coordinate Mapping Pipeline" alt="Four-step diagram of pixel to physical coordinate mapping" align="center" width="100%" >}}


#### Ray Generation Code
The following Python code shows how we can implement a `camera` class in order to create rays:

> The code below uses [drjit](https://drjit.readthedocs.io/), the same array library that powers the Mitsuba renderer. 

```python
import math
import drjit as dr

# can switch between 'cuda' or 'llvm'
from drjit.cuda import Float, Int, Array3f, Matrix3f

class Ray:
    def __init__(self, origin, direction):
        self.o = origin
        self.d = direction

class Camera:
    def __init__(self, pos, target, fov, aspect=1.0, H=800, W=800):
        self.pos = Array3f(*pos)
        self.target = Array3f(*target)
        self.world_up = Array3f(0, 1, 0)
        self.fov = fov
        self.aspect = W / H
        self.H = H
        self.W = W
        self.f = 1.0

    def lookAt(self, pos, target):
        forward = dr.normalize(self.target - self.pos)
        right = dr.normalize(dr.cross(forward, self.world_up))
        up = dr.normalize(dr.cross(right, forward))

        M_cam = Matrix3f(right, up, forward)
        return M_cam


    def rays(self):
        
        # Generate 1D pixel indices
        num_pixels = self.H * self.W
        idx = dr.arange(Int, num_pixels)

        # Generate the indices of pixels as (x, y)
        x_ind = idx % self.W
        y_ind = idx // self.W

        # Scale to [0, 1] range with +0.5 to reach center 
        # or change 0.5 to randomness in [0, 1] to jitter within pixel
        x_center = (Float(x_ind) + 0.5) / self.W
        y_center = (Float(y_ind) + 0.5) / self.H

        xs = x_center * 2.0 - 1.0
        ys = y_center * -2.0 + 1.0

        # Get the height and width in physical units
        # tan(beta / 2) = height /2 * f
        height = 2.0 * self.f * math.tan(math.radians(self.fov) / 2.0)
        width = height * self.aspect

        # Scale to [-width/2, width/2] x [-heght/2, height/2]
        px = xs * (width / 2.0)
        py = ys * (height / 2.0)

        # Create the Camera-to-World transformation matrix.
        M_cam = self.lookAt(self.pos, self.target)

        # Pack the camera-space ray directions into an Array3f
        dirs_cam = Array3f(px, py, self.f)

        # 5. Matrix multiplication (Matrix @ Vector)
        rd = M_cam @ dirs_cam
        rd = dr.normalize(rd) # normalize the ray direciton

        ro = self.pos 

        return Ray(ro, rd) # Convert to Ray class and return 

```


#### Ray Generation in GLSL

For the glsl shader, the pixel coordinate itself comes from `gl_FragCoord`. Dividing by `u_resolution.y` keeps the field of view stable while correcting the aspect ratio:

*(We can also see the color of pixels in {{< figref "fig-primary-ray-generation" >}} is same as the image formed)*

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 rd = normalize(vec3(uv, -1.0));

    // Visualize direction: [-1,1] -> [0,1].
    fragColor = vec4(rd, 1.0);
}
{{< /glsl >}}

### Anti-Aliasing

Sampling only the pixel center is simple, but it aliases hard edges. The jaggies (also called staircase artifacts) are clearly visible in the polygon render. Ideally, we want the average colors of objects within the pixel area. A common fix is to take several samples at slightly perturbed positions inside the pixel and average the results (A Monte Carlo estimate of the weighted area integration):

$$
\mathbf{d}_i=\mathrm{normalize}\!\left(u+\Delta u_i,\;v+\Delta v_i,\;-1\right),
\qquad
\mathbf{C}_\text{pixel}=\frac{1}{N}\sum_{i=1}^{N}\mathbf{C}(\mathbf{d}_i)
$$

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/aa_jitter.svg" id="fig-aa-jitter" caption="Anti-aliasing perturbs sample positions inside the pixel instead of always shooting through the center." title="Perturbed Pixel Samples" alt="Pixel grid with jittered sample points" align="center" >}}

{{< figure src="/images/intro-to-rendering/raytracing/primary_rays/aliasing.svg" id="fig-aliasing-comparison" caption="Aliasing comparison: (Left) Original vector geometry, (Middle) Jagged aliasing from center-only sampling, (Right) Smooth anti-aliased result using jittered sub-pixel sampling." title="Aliasing Comparison" alt="Comparison of vector, aliased, and anti-aliased rendering" align="center" width="100%" >}}

In a production renderer those offsets are usually stratified, blue-noise, or accumulated over many frames. For this introductory shader, one center ray is enough to keep the moving parts visible.




## Geometry Representations and Intersections

Once we have rays shooting into our scene, the immediate next question is: how is the scene represented? Based on how we define our geometry, the intersection logic—whether we compute exact intersections or iteratively sample along the ray—will fundamentally change.

In computer graphics, geometry is typically represented in three main ways:

- **Analytic primitives** such as spheres, planes, and cylinders are defined by exact mathematical equations. Their intersections usually have closed-form algebraic solutions. While they are lightning-fast to intersect, they are not very flexible for modeling complex real-world objects.
- **Triangles (Explicit Geometry)** are the fundamental building blocks of 3D graphics. They are explicit surface primitives that can approximate any shape. They are widely used in rasterization because they project cleanly to screen space, but ray tracers also intersect them directly using highly optimized ray-triangle tests.
- **Signed Distance Functions (Implicit Geometry)** are continuous mathematical fields. Instead of storing a mesh of explicit vertices, an SDF returns the shortest distance from any point in space to the nearest surface. It returns a positive value outside the object, zero exactly on the surface, and a negative value inside. Intersecting with an SDF is done through an iterative process called *ray marching*, as there is no explicit surface to algebraically intersect with.

Let's dive into the mathematics and code for each of these representations.

---

### 1. Ray-Sphere Intersection

{{< figure src="/images/intro-to-rendering/representation/sphere_intersection.svg" id="fig-sphere-intersection" caption="Ray-Sphere Intersection: Substituting the ray equation into the sphere's implicit equation yields a quadratic in $t$." title="Ray-Sphere Intersection" alt="Diagram showing ray intersecting a sphere at two points" align="center" >}}


A sphere is one of the simplest analytic primitives to intersect. It is defined by its center point ${\color{#109618}\mathbf{c}}$ and its radius ${\color{#990099}R}$. Any point $\mathbf{p}$ on the surface of the sphere satisfies the equation:

$$ \|\mathbf{p} - {\color{#109618}\mathbf{c}}\|^2 = {\color{#990099}R}^2 $$

We want to find if our ray ever reaches a point $\mathbf{p}$ that satisfies this equation. Recall our ray equation, defined by an origin ${\color{#3273F6}\mathbf{o}}$ and a normalized direction ${\color{#FF4B4B}\mathbf{d}}$:

$$ \mathbf{p} = {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}} $$

To find the intersection, we simply substitute the ray equation into the sphere equation:

$$ \| ({\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}}) - {\color{#109618}\mathbf{c}} \|^2 = {\color{#990099}R}^2 $$

To make the math cleaner, let $\mathbf{q} = {\color{#3273F6}\mathbf{o}} - {\color{#109618}\mathbf{c}}$ (the vector from the sphere's center to the ray's origin). Expanding the squared magnitude (which is the dot product of the vector with itself) gives us a classic quadratic equation in terms of $t$:

$$ ({\color{#FF4B4B}\mathbf{d}} \cdot {\color{#FF4B4B}\mathbf{d}})t^2 + 2(\mathbf{q} \cdot {\color{#FF4B4B}\mathbf{d}})t + (\mathbf{q} \cdot \mathbf{q} - {\color{#990099}R}^2) = 0 $$

This is in the standard quadratic form $At^2 + Bt + C = 0$, where:
*   $A = {\color{#FF4B4B}\mathbf{d}} \cdot {\color{#FF4B4B}\mathbf{d}}$ (If our ray direction is normalized, $A = 1$)
*   $B = 2(\mathbf{q} \cdot {\color{#FF4B4B}\mathbf{d}})$
*   $C = \mathbf{q} \cdot \mathbf{q} - {\color{#990099}R}^2$

Using the quadratic formula $t = \frac{-B \pm \sqrt{B^2 - 4AC}}{2A}$, we can find the roots. 
*   If the discriminant ($B^2 - 4AC$) is negative, the ray misses the sphere.
*   If it is zero, the ray grazes the sphere (one hit).
*   If it is positive, the ray goes through the sphere (two hits). The smallest positive root $t$ is our first visible hit.

Once we find the hit distance $t$, the hit point is $\mathbf{p} = {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}}$, and the surface normal is simply the normalized vector from the center to the hit point: $\mathbf{n} = (\mathbf{p} - {\color{#109618}\mathbf{c}}) / {\color{#990099}R}$.


{{< figure src="/images/intro-to-rendering/representation/sphere_cases.svg" id="fig-sphere-cases" caption="The three intersection cases based on the discriminant $h$: missing the sphere, grazing it, or passing through." title="Intersection Cases" alt="Diagram showing three rays: miss, grazing hit, and two hits" align="center" >}}


{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

// Returns t if it hits, -1.0 otherwise. Also outputs the normal.
float intersectSphere(vec3 ro, vec3 rd, vec3 center, float radius, out vec3 normal) {
    vec3 q = ro - center;
    float b = dot(q, rd);
    float c = dot(q, q) - radius * radius;
    
    // Discriminant (A = 1 because rd is normalized)
    float h = b * b - c;
    if (h < 0.0) return -1.0; // Ray misses
    
    // Smallest positive root
    float t = -b - sqrt(h);
    if (t > 0.0) {
        vec3 p = ro + t * rd;
        normal = normalize(p - center);
        return t;
    }
    return -1.0;
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

Triangles are the backbone of 3D modeling. Let a triangle be defined by its three vertices ${\color{#FF9900}\mathbf{a}}$, ${\color{#0099C6}\mathbf{b}}$, and ${\color{#DD4477}\mathbf{c}}$. Any point $\mathbf{p}$ lying on the plane of this triangle can be written using **barycentric coordinates** $(u, v)$:

$$ \mathbf{p}(u, v) = {\color{#FF9900}\mathbf{a}} + u({\color{#0099C6}\mathbf{b}} - {\color{#FF9900}\mathbf{a}}) + v({\color{#DD4477}\mathbf{c}} - {\color{#FF9900}\mathbf{a}}) $$

{{< figure src="/images/intro-to-rendering/representation/triangle_barycentric.svg" id="fig-triangle-barycentric" caption="Barycentric coordinates $(u, v, w)$ can be thought of as the weights of the three vertices, or as ratios of sub-triangle areas." title="Barycentric Coordinates" alt="Triangle divided into three colored sub-areas representing barycentric weights" align="center" width="60%" >}}


Let's define the two edge vectors of the triangle originating from ${\color{#FF9900}\mathbf{a}}$ as $\mathbf{e}_1 = {\color{#0099C6}\mathbf{b}} - {\color{#FF9900}\mathbf{a}}$ and $\mathbf{e}_2 = {\color{#DD4477}\mathbf{c}} - {\color{#FF9900}\mathbf{a}}$. The ray hits the triangle when the ray equation equals the triangle plane equation:

$$ {\color{#3273F6}\mathbf{o}} + t{\color{#FF4B4B}\mathbf{d}} = {\color{#FF9900}\mathbf{a}} + u\mathbf{e}_1 + v\mathbf{e}_2 $$

Rearranging the terms to isolate our unknowns ($t, u, v$) on the left gives us a system of three linear equations:

$$ \begin{bmatrix} -{\color{#FF4B4B}\mathbf{d}} & \mathbf{e}_1 & \mathbf{e}_2 \end{bmatrix} \begin{bmatrix} t \\ u \\ v \end{bmatrix} = {\color{#3273F6}\mathbf{o}} - {\color{#FF9900}\mathbf{a}} $$

Let $\mathbf{s} = {\color{#3273F6}\mathbf{o}} - {\color{#FF9900}\mathbf{a}}$ (the vector from vertex $\mathbf{a}$ to the ray origin). We can solve this $3\times3$ system elegantly using **Cramer's Rule**, which expresses the solution in terms of determinants. 

Geometrically, the determinant of a $3\times3$ matrix composed of three vectors $\det(\mathbf{u}, \mathbf{v}, \mathbf{w})$ is the **scalar triple product**, written as $\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})$. It represents the volume of the parallelepiped formed by the three vectors.

Using Cramer's Rule, the solution is:

$$ \begin{bmatrix} t \\ u \\ v \end{bmatrix} = \frac{1}{\det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{e}_1, \mathbf{e}_2)} \begin{bmatrix} \det(\mathbf{s}, \mathbf{e}_1, \mathbf{e}_2) \\ \det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{s}, \mathbf{e}_2) \\ \det(-{\color{#FF4B4B}\mathbf{d}}, \mathbf{e}_1, \mathbf{s}) \end{bmatrix} $$

{{< figure src="/images/intro-to-rendering/representation/triangle_intersection.svg" id="fig-triangle-intersection" caption="Möller-Trumbore Algorithm: We equate the ray and triangle equations and solve for the intersection distance $t$ and barycentric coordinates $(u, v)$ simultaneously." title="Ray-Triangle Intersection" alt="Diagram showing ray hitting a triangle with basis vectors and s-vector labeled" align="center" >}}

This translates to the famous **Möller-Trumbore algorithm**. To make it computationally efficient, we define cross products that we can reuse:

1.  Let $\mathbf{p} = {\color{#FF4B4B}\mathbf{d}} \times \mathbf{e}_2$. The denominator becomes $\mathbf{e}_1 \cdot \mathbf{p}$. If this is $0$, the ray is parallel to the triangle.
2.  The $u$ coordinate becomes $u = (\mathbf{s} \cdot \mathbf{p}) / (\mathbf{e}_1 \cdot \mathbf{p})$.
3.  Let $\mathbf{q} = \mathbf{s} \times \mathbf{e}_1$. The $v$ coordinate becomes $v = ({\color{#FF4B4B}\mathbf{d}} \cdot \mathbf{q}) / (\mathbf{e}_1 \cdot \mathbf{p})$.
4.  The hit distance becomes $t = (\mathbf{e}_2 \cdot \mathbf{q}) / (\mathbf{e}_1 \cdot \mathbf{p})$.

The intersection is strictly inside the triangle if $u \ge 0$, $v \ge 0$, $u + v \le 1$, and $t > 0$. Notice how this brilliantly evaluates the hit without ever explicitly computing the plane's normal!

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
    vec3 pvec = cross(rd, e2);
    float det = dot(e1, pvec);

    // If det is near zero, ray lies in the plane of the triangle
    if (abs(det) < 0.0001) return false;

    float invDet = 1.0 / det;
    vec3 svec = ro - a;
    
    // Calculate u and test bounds
    float u = dot(svec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) return false;

    vec3 qvec = cross(svec, e1);
    
    // Calculate v and test bounds
    float v = dot(rd, qvec) * invDet;
    if (v < 0.0 || u + v > 1.0) return false;

    // Calculate t
    t = dot(e2, qvec) * invDet;
    
    bary = vec3(1.0 - u - v, u, v);
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

A Signed Distance Function (SDF) describes geometry implicitly. Formally, for a solid object occupying a volume $\Omega$ with boundary surface $\partial \Omega$, the SDF $f(\mathbf{p})$ at any point $\mathbf{p} \in \mathbb{R}^3$ is defined as:

$$
f(\mathbf{p}) = \begin{cases} 
+\min_{\mathbf{x} \in \partial \Omega} \|\mathbf{p} - \mathbf{x}\| & \text{if } \mathbf{p} \text{ is outside } \Omega \\
0 & \text{if } \mathbf{p} \text{ is on the surface } \partial \Omega \\
-\min_{\mathbf{x} \in \partial \Omega} \|\mathbf{p} - \mathbf{x}\| & \text{if } \mathbf{p} \text{ is inside } \Omega 
\end{cases}
$$

Because $f(\mathbf{p})$ guarantees the exact distance to the *nearest* surface, it gives us a spatial "safe zone." If we are at position $\mathbf{p}$ and $f(\mathbf{p}) = 2.0$, we can shoot a ray in *any* direction by exactly $2.0$ units, and we are mathematically guaranteed not to hit anything.

This leads to the **Sphere Tracing** (or Ray Marching) algorithm. Instead of solving an algebraic equation, take iterative steps along the ray:

$$ t_{k+1} = t_k + f({\color{#3273F6}\mathbf{o}} + t_k{\color{#FF4B4B}\mathbf{d}}) $$

We repeat this until $f(\mathbf{p})$ becomes extremely small (a hit), or $t$ becomes extremely large (a miss).

{{< figure src="/images/intro-to-rendering/representation/sdf.svg" id="fig-sdf-visualization" caption="Sphere Tracing: We use the SDF value to safely 'march' along the ray until we hit the surface." title="Signed Distance Field" alt="SDF contour visualization" align="center" noinvert=true >}}




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
    // Normalize pixel coordinates (from -1 to 1 on the y-axis)
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    
    vec2 probe;
    
    // If mouse is at (0,0) [meaning not hovered], animate the probe
    if (u_mouse.x <= 0.0 && u_mouse.y <= 0.0) {
        probe = vec2(cos(u_time * 0.8) * 0.8, sin(u_time * 0.5) * 0.6);
    } else {
        // Map mouse pixel coordinates to normalized screen space
        probe = (2.0 * u_mouse - u_resolution.xy) / u_resolution.y;
    }

    // Evaluate the SDF for the current pixel
    float d = sdCircle(p, 0.5);
    
    // Base Colors (Matched exactly to LaTeX RGB values)
    // Outside (Blue): RGB(80, 160, 240) -> vec3(0.314, 0.627, 0.941)
    // Inside (Red): RGB(235, 80, 60) -> vec3(0.922, 0.314, 0.235)
    vec3 col = (d > 0.0) ? vec3(0.314, 0.627, 0.941) : vec3(0.922, 0.314, 0.235);
    
    // Add dark gradients near the surface (decay factor matches LaTeX)
    float decay = (d > 0.0) ? 3.0 : 4.0;
    col *= 1.0 - exp(-decay * abs(d));
    
    // Add repeating isoline waves (Math matched to LaTeX)
    col *= 0.85 + 0.15 * cos(150.0 * d);
    
    // Draw the exact surface (d = 0) as a white outline
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.01, abs(d)));

    // Draw the SDF probe demonstrating the safe-stepping ring
    float d_probe = sdCircle(probe, 0.5);
    
    // Yellow Probe: RGB(255, 240, 0) -> vec3(1.0, 0.941, 0.0)
    vec3 yellow = vec3(1.0, 0.941, 0.0);
    
    // Draw the yellow ring (radius equals the exact distance to the surface)
    col = mix(col, yellow, 1.0 - smoothstep(0.0, 0.005, abs(length(p - probe) - abs(d_probe)) - 0.0025));
    
    // Draw the yellow center point
    col = mix(col, yellow, 1.0 - smoothstep(0.0, 0.005, length(p - probe) - 0.015));

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

#### Calculating Normals for SDFs
Since we don't have explicit geometry, how do we find the surface normal for lighting? The normal vector is simply the direction of the steepest ascent of the distance field. In calculus, this is the **gradient** of the function, denoted as $\nabla f(\mathbf{p})$:

$$ \mathbf{n} = \nabla f(\mathbf{p}) = \begin{pmatrix} \frac{\partial f}{\partial \color{#ef4444}x} \\ \frac{\partial f}{\partial \color{#22c55e}y} \\ \frac{\partial f}{\partial \color{#3b82f6}z} \end{pmatrix} $$

In shader code, we approximate this using finite differences. The standard approach is the **Central Difference** method, which evaluates the SDF at tiny offsets $\varepsilon$ along each axis:

$$ \mathbf{n} \approx \mathrm{normalize}\! \begin{pmatrix} f(\mathbf{p} + \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) - f(\mathbf{p} - \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) \\ f(\mathbf{p} + \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) - f(\mathbf{p} - \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) \\ f(\mathbf{p} + \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) - f(\mathbf{p} - \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) \end{pmatrix} $$

This requires 6 evaluations of the SDF. A cheaper approximation (often used for performance) is the **Forward Difference** method, which uses the center point and only requires 4 evaluations:

$$ \mathbf{n} \approx \mathrm{normalize}\! \begin{pmatrix} f(\mathbf{p} + \varepsilon {\color{#ef4444}\mathbf{\hat{i}}}) - f(\mathbf{p}) \\ f(\mathbf{p} + \varepsilon {\color{#22c55e}\mathbf{\hat{j}}}) - f(\mathbf{p}) \\ f(\mathbf{p} + \varepsilon {\color{#3b82f6}\mathbf{\hat{k}}}) - f(\mathbf{p}) \end{pmatrix} $$



Here is a shader that uses Sphere Tracing to render a Torus, calculating its normals dynamically using the forward difference method.

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
        
        // If we are close enough to the surface, it's a hit!
        if(abs(d) < 0.001) {
            vec3 n = calcNormal(p);
            // Map normal to [0,1] range for visualization
            col = n * 0.5 + 0.5;
            break;
        }
        // If we marched too far, we missed the object
        if(t > max_d) break;
        
        // Step forward by the safe distance
        t += d;
    }

    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}


## Shading Models

Intersection algorithms tell us *where* a ray hits and *which way* the surface faces. Shading models answer the next question: *what color should that point be?*

When light strikes a surface, part of its energy is absorbed and part is scattered. The physics of this interaction is captured by the **Rendering Equation**:

$$ L_o(\mathbf{x}, \boldsymbol{\omega}_o) = \underbrace{L_e(\mathbf{x}, \boldsymbol{\omega}_o)}_{\text{Emitted Radiance}} + \underbrace{\int_{\Omega} L_i(\mathbf{x}, \boldsymbol{\omega}_i) f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) (\mathbf{n} \cdot \boldsymbol{\omega}_i) \, d\boldsymbol{\omega}_i}_{\text{Reflected Radiance}} $$

The outgoing radiance $L_o$ toward the viewer equals the emitted light $L_e$ plus the integral of all incoming light $L_i$ scattered by the surface. We integrate over $\Omega$ (the upper hemisphere defined by the surface normal) because opaque surfaces only receive light from their exterior side. The function $f_s$ is the **Bidirectional Reflectance Distribution Function (BRDF)**, which encodes how a material distributes incoming light, and the dot product $(\mathbf{n} \cdot \boldsymbol{\omega}_i)$ accounts for foreshortening via Lambert's cosine law.

Evaluating this integral is computationally immense — it involves infinite recursive scattering between all objects in the scene. Real-time graphics have therefore historically relied on simpler, empirical models that approximate the result locally.

> **Gamma Correction:** Before we look at the code, it is important to remember that physical light calculations are linear, but our computer monitors display light non-linearly. To fix this, we apply a $1/2.2$ power function to our final color at the very end of our shaders—a process known as gamma correction.

### Light Sources and Attenuation

Before applying any reflection model, we first need to know how much light energy actually reaches the surface.
*   **Directional (Infinite) Lights**: Placed infinitely far away (like the sun). All rays are parallel, and intensity does not diminish over distance.
*   **Point Lights**: Radiate equally in all directions from a specific point.
*   **Spot Lights**: Radiate from a point, but restricted to a specific cone/direction.

For point and spot lights, energy disperses as it travels through space. Physically, light intensity falls off according to the inverse-square law ($1/d^2$). However, for artistic control in rendering pipelines, this distance attenuation is generally modeled using constant ($k_c$), linear ($k_l$), and quadratic ($k_q$) terms:

$$ I_{attenuated} = \frac{1}{k_c + k_l d + k_q d^2} I_{source} $$

### The Phong Reflection Model

With the incoming light intensity established, we can now compute how the surface responds. The most famous empirical model is the **Phong reflection model**, which decomposes local illumination into three physically motivated components: **Ambient**, **Diffuse**, and **Specular**.

{{< figure src="/images/intro-to-rendering/lighting/sphere_lighting.svg" id="fig-phong-components" caption="The components of the Phong reflection model: (Left) Ambient base, (Middle) Diffuse shading based on surface orientation, (Right) Specular highlight for shiny reflections." title="Phong Shading Components" alt="Three spheres showing ambient, diffuse, and specular components" align="center" width="100%" noinvert=true >}}

#### 1. Ambient Light
In the real world, light bounces off walls, floors, and other objects, filling the environment with indirect illumination. Instead of simulating these complex global bounces, the ambient term provides a constant base level of light so that objects in shadow are not completely pitch black.

$$
L_a = k_a I_a
$$

Here, $I_a$ is the intensity of the ambient light, and $k_a$ is the material's ambient reflection coefficient.

#### 2. Lambertian Diffuse
A perfectly matte (diffuse) surface, like chalk or unpolished wood, scatters light equally in all directions. Because the scattered light is uniform, the appearance of a diffuse surface does not depend on where the camera is positioned. 

However, it *does* depend heavily on the surface orientation relative to the light. If you hold a flashlight directly above a surface, the beam is concentrated. If you tilt the surface, the same beam spreads over a larger area, decreasing the intensity per unit area. This is governed by Lambert's cosine law, which we calculate using the dot product between the normalized surface normal $\mathbf{n}$ and the normalized light direction $\mathbf{l}$:

$$
L_d = k_d I_d \max(0, {\color{#212121}\mathbf{n}}\cdot{\color{#E65100}\mathbf{l}})
$$

We clamp the dot product at zero because a negative value means the light is hitting the back of the surface, which should contribute no illumination.

#### 3. Specular Highlights
Smooth surfaces, like polished metal or wet plastic, are not perfect diffusers. They exhibit specular highlights—bright spots where the light reflects strongly in a specific direction. Unlike diffuse reflection, specular reflection is highly dependent on the viewer's position.

A perfect mirror reflects light exactly along the reflection vector $\mathbf{r}$. Using basic vector projection, we can compute $\mathbf{r}$ by taking the incoming light vector $\mathbf{l}$, projecting it onto the normal $\mathbf{n}$, and reflecting it across the normal:

$$
{\color{#2E7D32}\mathbf{r}} = 2({\color{#212121}\mathbf{n}} \cdot {\color{#E65100}\mathbf{l}}){\color{#212121}\mathbf{n}} - {\color{#E65100}\mathbf{l}}
$$

For surfaces that are shiny but not perfect mirrors, the reflected light scatters in a tight lobe around $\mathbf{r}$. As the angle $\phi$ between the reflection vector $\mathbf{r}$ and the view direction $\mathbf{v}$ increases, the intensity drops. Phong modeled this drop-off using a cosine power function:

$$
L_s = k_s I_s \max(0, {\color{#2E7D32}\mathbf{r}} \cdot {\color{#1565C0}\mathbf{v}})^\alpha
$$

The exponent $\alpha$ is the **shininess coefficient**. A low value (e.g., $5 - 10$) produces a broad, soft highlight like plastic, while a high value (e.g., $100 - 200$) produces a sharp, tight highlight typical of polished metals.

{{< figure src="/images/intro-to-rendering/lighting/phong.svg" id="fig-phong-vectors" caption="The Phong reflection model vectors. The light vector $\mathbf{l}$ is reflected across the surface normal $\mathbf{n}$ to compute the reflection vector $\mathbf{r}$, which is then compared with the view vector $\mathbf{v}$." title="Phong Vectors" alt="Vectors for Phong reflection model" align="center" width="500px" >}}

Combining all three gives the complete Phong reflection model:

$$
L = \underbrace{k_a I_a}_{\text{Ambient}} + \underbrace{k_d I_d \max(0,{\color{#212121}\mathbf{n}}\cdot{\color{#E65100}\mathbf{l}})}_{\text{Diffuse}} + \underbrace{k_s I_s \max(0,{\color{#2E7D32}\mathbf{r}}\cdot{\color{#1565C0}\mathbf{v}})^\alpha}_{\text{Specular}}
$$

<object type="text/html" data="/interactive/phong_lighting_sphere.html" style="width:100%; max-width:760px; height:440px; solid var(--border); background: var(--theme); display:block;"></object>
<p style="text-align: center; font-style: italic; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">Interactive Phong reflection model. Drag on the sphere to reposition the light; toggle between Phong and Blinn-Phong specular models.</p>

<iframe src="/interactive/phong_steps.html" width="100%" height="560" frameborder="0" style="border-radius:8px; border:1px solid var(--border); margin: 1.5rem auto; display: block;"></iframe>

Below is the Phong reflection model applied to a test scene with two spheres on a checkerboard floor. Only local shading is computed here — no shadow rays, no reflections. Notice how the floor receives uniform light everywhere, even directly beneath the spheres where a shadow should be. This is the key limitation of local-only models.

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

Calculating the exact reflection vector $\mathbf{r}$ at every pixel requires several vector operations. Jim Blinn proposed a cheaper approximation that produces nearly identical results: the **halfway vector**.

Instead of finding the angle between the reflection $\mathbf{r}$ and the viewer $\mathbf{v}$, we calculate the vector that sits exactly halfway between the light $\mathbf{l}$ and the viewer $\mathbf{v}$:

$$
{\color{#6A1B9A}\mathbf{h}} = \frac{{\color{#E65100}\mathbf{l}} + {\color{#1565C0}\mathbf{v}}}{\|{\color{#E65100}\mathbf{l}} + {\color{#1565C0}\mathbf{v}}\|}
$$

{{< figure src="/images/intro-to-rendering/lighting/blinn.svg" id="fig-blinn-vectors" caption="The Blinn-Phong modification vectors. Instead of the reflection vector, the halfway vector $\mathbf{h}$ is used, which sits exactly halfway between the light vector $\mathbf{l}$ and view vector $\mathbf{v}$." title="Blinn-Phong Vectors" alt="Vectors for Blinn-Phong modification" align="center" width="500px" >}}

If the halfway vector ${\color{#6A1B9A}\mathbf{h}}$ perfectly aligns with the surface normal ${\color{#212121}\mathbf{n}}$, the highlight is at its maximum. The specular term becomes $\max(0, {\color{#212121}\mathbf{n}} \cdot {\color{#6A1B9A}\mathbf{h}})^\beta$. (Note that to match the visual size of a Phong highlight, the Blinn-Phong exponent $\beta$ must be roughly $4$ times larger than the Phong exponent $\alpha$). 

This was a massive optimization for early rendering pipelines: if the light and the camera are infinitely far away, $\mathbf{l}$ and $\mathbf{v}$ are constant, meaning $\mathbf{h}$ only needs to be computed *once per scene*, not once per pixel.

<iframe src="/interactive/blinn_steps.html" width="100%" height="560" frameborder="0" style="border-radius:8px; border:1px solid var(--border); margin: 1.5rem auto; display: block;"></iframe>

The same scene as above, now shaded with Blinn-Phong. The only code change is in the specular calculation — `dot(n, h)^β` replaces `dot(r, v)^α`. The highlights are slightly rounder and wider.

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

The math above tells us *how* to calculate color, but the pipeline must decide *where* to calculate it. In rasterization, there are two primary ways to apply these equations across a triangle mesh:

1. **Gouraud Shading (Vertex Shading):** The lighting equations are evaluated only at the three vertices of a triangle. The resulting *colors* are then linearly interpolated across the pixels of the triangle. This is very fast, but it suffers from severe artifacts: if a sharp specular highlight falls in the exact center of a large triangle, the vertices will all be dark, and the highlight will completely disappear!
2. **Phong Shading (Pixel/Fragment Shading):** Instead of interpolating colors, we linearly interpolate the *normal vector* $\mathbf{n}$ across the triangle's surface. The full lighting equation is then evaluated at every single pixel. This solves the highlight problem and produces beautifully smooth curved surfaces.

> **Note the terminology:** The **Phong reflection model** (the math equation for ambient/diffuse/specular light) is fundamentally different from **Phong shading** (the technique of interpolating normals per-pixel). You can technically evaluate the Phong reflection model using Gouraud shading, though it will look poor! 
> 
> Furthermore, when linearly interpolating unit normal vectors across a triangle in a rasterizer, the resulting vectors will slightly shrink in length. Therefore, they must be **re-normalized** dynamically in the fragment shader before applying the reflection model.

### Limitations: Self-Shadowing and Ambient Occlusion

The Phong and Blinn-Phong models evaluate lighting at each surface point independently — they have no knowledge of the rest of the scene. This means:

*   **No self-shadowing.** A sphere sitting on a floor will not cast a shadow, because the model never asks whether anything blocks the light.
*   **No contact darkening.** Where two surfaces meet (e.g., the base of a sphere on a floor), real-world light is partially occluded by nearby geometry. Local models miss this entirely.
*   **The ambient term is a flat constant.** Every surface point receives the same $k_a I_a$, regardless of how enclosed or exposed it is.

**Ambient Occlusion (AO)** is a popular technique that addresses the third problem without requiring full global illumination. The idea is simple: at each surface point, estimate what fraction of the surrounding hemisphere is blocked by nearby geometry. Points in corners, crevices, and contact regions score low (more occluded), while exposed surfaces score high.

$$
A(\mathbf{p}) = \frac{1}{\pi} \int_{\Omega} V(\mathbf{p}, \boldsymbol{\omega}) \, (\mathbf{n} \cdot \boldsymbol{\omega}) \, d\boldsymbol{\omega}
$$

Here $V(\mathbf{p}, \boldsymbol{\omega})$ is a binary visibility function — $1$ if the hemisphere direction $\boldsymbol{\omega}$ is unblocked, $0$ if nearby geometry occludes it. The result $A(\mathbf{p})$ is then multiplied into the ambient (and sometimes diffuse) term, darkening the tucked-away areas that a flat ambient constant would otherwise over-illuminate.

In screen-space implementations like **SSAO** (Screen-Space Ambient Occlusion), the visibility check is approximated by sampling the depth buffer around each pixel — a fast, purely post-processing approach that requires no scene knowledge at all. In ray-traced pipelines, short-range occlusion rays can compute AO directly. 

Here is our test scene rendered with local Phong shading plus an Ambient Occlusion term computed analytically for each sphere. Notice how contact shadows naturally appear underneath the spheres where they approach the floor plane.

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

// Analytic Ambient Occlusion of a sphere
float sphereAO(vec3 p, vec3 n, vec3 c, float r) {
    vec3 v = c - p;
    float d = length(v);
    return max(0.0, dot(n, v / d)) * (r * r) / (d * d);
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

        // Compute analytical AO from both spheres
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

We will see full shadow and reflection rays in the next section.

---

## Ray Tracing

The shading models above are strictly **local**—they only consider the light hitting a surface directly from a source. **Whitted ray tracing** extends this idea into a global context by tracing visibility recursively. Once a primary ray hits a surface, the rendering algorithm spawns new secondary rays to evaluate the global environment.

Instead of just intersection math, Ray Tracing is defined by this recursive routing logic:

#### 1. Shadow Rays (Visibility Testing)
To determine if a point $\mathbf{p}$ is in shadow, we don't guess. We cast a **shadow ray** from $\mathbf{p}$ directly toward the light source $\mathbf{l}$. 
*   If the ray hits an object *before* it reaches the light ($t_{\text{hit}} < t_{\text{light}}$), the point is occluded. We skip the diffuse and specular calculations and only apply ambient light.
*   To prevent a surface from shadowing itself due to floating-point inaccuracies (Shadow Acne), we offset the ray origin slightly along the normal: $\mathbf{p}_{origin} = \mathbf{p} + \epsilon\mathbf{n}$.

#### 2. Reflection Rays
For shiny surfaces like mirrors or water, we calculate the reflection vector $\mathbf{r}$ exactly as we did in the Phong model:
$$ \mathbf{r} = 2(\mathbf{n} \cdot \mathbf{v})\mathbf{n} - \mathbf{v} $$
*(Where $\mathbf{v}$ points from the surface back to the camera).* 
We then cast a new ray from $\mathbf{p} + \epsilon\mathbf{n}$ in the direction of $\mathbf{r}$. Whatever color that ray eventually hits is added to the current pixel's color.

#### 3. Refraction Rays (Transmission)
For transparent materials like glass, light bends as it passes through the surface boundary. According to **Snell's Law**, the angle of incidence $\theta_L$ and the angle of transmission $\theta_T$ are related by the indices of refraction ($\eta$):
$$ \eta_L \sin \theta_L = \eta_T \sin \theta_T $$
The exact transmission vector $\mathbf{t}$ can be derived from the normal $\mathbf{n}$ and the incoming view vector $\mathbf{v}$. If the light enters a medium with a lower index of refraction at a steep enough angle, the math under the square root becomes negative. This physical phenomenon is **Total Internal Reflection**—no light is refracted; it is all reflected inside the object.

<iframe src="/interactive/ray_tracing_steps.html" width="100%" height="600" frameborder="0" style="border-radius:8px; border:1px solid var(--border); margin: 1.5rem auto; display: block;"></iframe>

Here is the same scene rendered with full recursive ray tracing. Shadow rays now block direct light where occluded, and reflection rays on the chrome sphere pick up the environment. Compare with the local-only shaders above.

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

struct Hit { float t; vec3 n; vec3 col; float refl; };

Hit traceScene(vec3 ro, vec3 rd) {
    Hit best = Hit(1e20, vec3(0), vec3(0), 0.0);
    vec3 n; float t;

    // Red sphere
    t = hitSphere(ro, rd, vec3(-0.8, 0.0, -1.0), 1.0);
    if (t > 0.0 && t < best.t) { best = Hit(t, normalize(ro+rd*t - vec3(-0.8,0,-1)), vec3(0.85,0.15,0.1), 0.05); }

    // Chrome sphere
    t = hitSphere(ro, rd, vec3(1.0, -0.3, 0.0), 0.7);
    if (t > 0.0 && t < best.t) { best = Hit(t, normalize(ro+rd*t - vec3(1.0,-0.3,0.0)), vec3(0.9), 0.8); }

    // Floor plane
    t = hitPlane(ro, rd, -1.0);
    if (t > 0.0 && t < best.t) {
        vec3 p = ro + rd * t;
        float check = step(0.5, fract(p.x * 0.5)) + step(0.5, fract(p.z * 0.5));
        check = mod(check, 2.0);
        best = Hit(t, vec3(0,1,0), mix(vec3(0.3), vec3(0.7), check), 0.1);
    }
    return best;
}

vec3 shade(Hit hit, vec3 p, vec3 rd) {
    vec3 lightPos = vec3(3.0, 4.0, 2.0);
    vec3 l = normalize(lightPos - p);
    vec3 v = -rd;

    // Shadow ray
    Hit sh = traceScene(p + hit.n * 0.01, l);
    float shadow = (sh.t < length(lightPos - p)) ? 0.15 : 1.0;

    float diff = max(dot(hit.n, l), 0.0) * shadow;
    float spec = pow(max(dot(reflect(-l, hit.n), v), 0.0), 64.0) * shadow;
    return vec3(0.06) + hit.col * diff + vec3(0.7) * spec;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 1.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    vec3 col = vec3(0.0);
    float atten = 1.0;

    // 2 bounces: primary + one reflection
    for (int bounce = 0; bounce < 2; bounce++) {
        Hit hit = traceScene(ro, rd);
        if (hit.t > 1e19) {
            col += atten * vec3(0.03, 0.04, 0.06);
            break;
        }
        vec3 p = ro + rd * hit.t;
        col += atten * (1.0 - hit.refl) * shade(hit, p, rd);

        // Reflection ray for next bounce
        atten *= hit.refl;
        if (atten < 0.01) break;
        ro = p + hit.n * 0.01;
        rd = reflect(rd, hit.n);
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

## Path Tracing

Whitted ray tracing handles mirrors and hard shadows well, but it cannot capture the soft, diffuse inter-reflections that make real scenes look natural — colored light bleeding from a red wall onto a white floor, for example. **Path tracing** solves this by actually evaluating the rendering equation via Monte Carlo integration.

Instead of spawning deterministic shadow and reflection rays, the path tracer shoots the ray in a *random* direction sampled from the hemisphere at each bounce. Over hundreds or thousands of samples per pixel, the noisy estimates converge to the true solution of the rendering equation. This is the same technique used by production renderers in film (Arnold, RenderMan, Cycles).

The key ideas — Monte Carlo integration, importance sampling, and the mathematics of BRDFs — are covered in depth in the next post in this series: [A comprehensive look into the Importance Sampling and Path Guiding for Path Tracing](https://usharma002.github.io/posts/neural-importance-sampling-path-tracing/)


--- 

The interactive below demonstrates how the same scene appears under different rendering paradigms. You can compare the local shading models (Phong and Blinn-Phong) — which calculate light per-surface and ignore inter-object visibility — against global illumination models (Ray Tracing and Path Tracing) that trace ray paths recursively to simulate accurate shadows, glossy reflections, and diffuse light transport.

---

<object type="text/html" data="/interactive/cornell_box_modes.html" style="width:100%; max-width:860px; height:860px; background: transparent; display:block; margin: 1.5rem auto;"></object>

---

## Sphere Tracing

While analytic root-finding (like the quadratic formula) works beautifully for simple shapes, it becomes mathematically complex for arbitrary objects. **Sphere Tracing** (or Ray Marching) is a numerical root-finding technique that replaces analytic equations with a Signed Distance Function (SDF).

Because the geometry in Sphere Tracing is mathematically implicit, adding a floor or morphing shapes means simply editing a `map()` function. Furthermore, because we do not have explicit geometry to provide vertex normals, we estimate the normal dynamically at the hit point by sampling the gradient of the SDF.

Here is the same two-sphere scene, now defined entirely through SDFs. The `map()` function replaces explicit intersection tests, and normals are estimated via the gradient. Shadow rays and reflection bounces work identically to the analytic version above.

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

// Gradient-based normal estimation
vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Shadow ray via sphere tracing
float calcShadow(vec3 ro, vec3 rd) {
    float t = 0.02;
    for (int i = 0; i < 30; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.15;
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

        float shadow = calcShadow(p + n * 0.01, l);
        float diff = max(dot(n, l), 0.0) * shadow;
        float spec = pow(max(dot(r, v), 0.0), 48.0) * shadow;
        col = c * 0.08 + c * diff + vec3(0.7) * spec;
    }

    col = pow(col, vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

## Volume Rendering

All of the techniques above assume that rays interact only with hard surfaces. **Volume rendering** removes that assumption: instead of stopping at the first intersection, rays sample a continuous density field along their path. At each sample point, the ray may be absorbed (Beer's Law), scattered in a new direction, or emit light.

### Participating Media

Volume rendering treats the scene as a participating medium rather than a set of opaque surfaces. As a ray travels through that medium, light can be absorbed, scattered out of the ray, scattered into the ray, or emitted by the medium itself.

- Absorption removes energy from the ray.
- Out-scattering redirects photons away from the viewing direction.
- In-scattering adds energy from other directions into the ray.
- Emission adds radiance generated by the medium.

{{< figure src="/images/intro-to-rendering/volume-rendering/volume-scatter.svg" id="fig-volume-scatter" caption="The four types of volume interactions in participating media: (a) Absorption, (b) Out-scattering, (c) In-scattering, and (d) Emission." title="Volume Scattering Interactions" alt="Volume scattering interactions: absorption, out-scattering, in-scattering, emission" align="center" width="800px" >}}

To keep the notation compact, graphics texts usually group absorption and out-scattering into an extinction coefficient $\sigma_t$:

$$
\sigma_t = \sigma_a + \sigma_s
$$

where $\sigma_a$ is the absorption coefficient and $\sigma_s$ is the scattering coefficient.

### Beer-Lambert Law

If we ignore scattering into the ray for a moment, the remaining light along a ray decays exponentially as it travels through the medium. For a homogeneous medium with constant extinction $\sigma_t$, the transmittance over distance $s$ is

$$
T(s) = e^{-\sigma_t s}.
$$

For a heterogeneous medium, extinction varies along the ray, so we integrate it instead:

$$
T(s) = \exp\left(-\int_0^s \sigma_t(x_u)\,du\right).
$$

The quantity inside the exponent is often called the optical depth $\tau(s)$:

$$
\operatorname{OD}(s) = \int_0^s \sigma_t(x_u)\,du, \qquad T(s) = e^{-\operatorname{OD}(s)}.
$$

> <details>
> <summary style="cursor: pointer;">Proof: Beer-Lambert Law</summary>
>
> Consider the homogeneous case first, where the extinction coefficient is constant along the ray. The radiance $L(s)$ obeys
>
> $$
\frac{dL(s)}{ds} = -\sigma_t L(s).
$$
>
> This says the rate of energy loss is proportional to the current radiance and the local extinction coefficient. Separate variables:
>
> $$
\frac{dL(s)}{L(s)} = -\sigma_t \, ds
$$
>
> Integrate both sides from the entry point $0$ to the current distance $s$:
>
> $$
\int_{L(0)}^{L(s)} \frac{dL'}{L'} = -\int_0^s \sigma_t \, du
$$
>
> The left-hand side becomes a logarithm:
>
> $$
\ln L(s) - \ln L(0) = -\sigma_t s
$$
>
> Exponentiating both sides gives the attenuation law:
>
> $$
L(s) = L(0)e^{-\sigma_t s}.
$$
>
> Since transmittance is the surviving fraction of the incoming radiance,
>
> $$
T(s) = \frac{L(s)}{L(0)},
$$
>
> we obtain
>
> $$
T(s) = e^{-\sigma_t s}.
$$
>
> For a heterogeneous medium, $\sigma_t$ varies along the ray, so we replace the constant product by an integral:
>
> $$
T(s) = \exp\left(-\int_0^s \sigma_t(x_u)\,du\right).
$$
>
> Special cases are immediate: if $\sigma_t = 0$, then $T = 1$; if $\sigma_t$ is constant, then we recover the usual exponential falloff.
>
> </details>

### Radiative Transfer

The full light transport model adds in-scattering and emission back into the ray. In ray parameter form, the radiance changes as

$$
\frac{dL(x_s,\omega)}{ds} = -\sigma_t(x_s)L(x_s,\omega) + \sigma_s(x_s)L_s(x_s,\omega) + \sigma_a(x_s)L_e(x_s,\omega),
$$

where $L_s$ denotes light scattered into the ray from other directions and $L_e$ is the radiance emitted by the medium.

The corresponding volume rendering equation can be written as

$$
L(x,\omega) = \int_0^s T(s')\big[\sigma_s(x_{s'})L_s(x_{s'},\omega) + \sigma_a(x_{s'})L_e(x_{s'})\big]\,ds' + T(s)L(0).
$$

The proof is a standard integrating-factor derivation.
> <details>
> <summary style="cursor: pointer;">Proof: from the RTE to the VRE</summary>
>
> Define the source term as
>
> $$
q(s) = \sigma_s(x_s)L_s(x_s,\omega) + \sigma_a(x_s)L_e(x_s,\omega).
$$
>
> Then the radiance equation can be written in standard linear ODE form:
>
> $$
 \frac{dL(s)}{ds} + \sigma_t(x_s)L(s) = q(s).
$$
>
> The integrating factor is
>
> $$
 I(s) = \exp\left(\int_0^s \sigma_t(x_u)\,du\right).
$$
>
> Multiplying the ODE by $I(s)$ gives
>
> $$
 I(s)\frac{dL(s)}{ds} + I(s)\sigma_t(x_s)L(s) = I(s)q(s).
$$
>
> By the product rule, the left-hand side is exactly
>
> $$
 \frac{d}{ds}\big[I(s)L(s)\big] = I(s)q(s),
$$
>
> because $I'(s) = I(s)\sigma_t(x_s)$.
>
> Integrate from the ray entry point $0$ to the current distance $s$:
>
> $$
 I(s)L(s) - I(0)L(0) = \int_0^s I(s')q(s')\,ds'.
> $$
>
> Since $I(0)=1$, solve for $L(s)$:
>
> $$
 L(s) = I(s)^{-1}\int_0^s I(s')q(s')\,ds' + I(s)^{-1}L(0).
$$
>
> Substituting the integrating factor back in and using
>
> $$
 I(s)^{-1} = \exp\left(-\int_0^s \sigma_t(x_u)\,du\right) = T(s),
 $$
>
> we get
>
> $$
L(s) = \int_0^s T(s')q(s')\,ds' + T(s)L(0).
$$
>
> Replacing $q(s')$ with the emission and in-scattering source terms yields the volume rendering equation:
>
> $$
L(x,\omega) = \int_0^s T(s')\big[\sigma_s(x_{s'})L_s(x_{s'},\omega) + \sigma_a(x_{s'})L_e(x_{s'})\big]\,ds' + T(s)L(0).
$$
>
> In practice, this is why front-to-back marching works: each sample contributes a local source term, but every contribution is discounted by the transmittance accumulated before that point.
>
> </details>

This is the complete participating-media model. The GLSL example below uses the simpler absorption-plus-emission case, which is enough to visualize a soft volumetric cloud.

Here is a live GLSL example demonstrating a volumetric density field. As rays step through the medium, transmittance decays via Beer's Law, while emitted light is accumulated along the path to produce a soft, cloud-like glow.

{{< glsl >}}
#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    vec3 ro   = vec3(0.0, 0.0, 3.0);
    vec3 rd   = normalize(vec3(uv, -1.0));

    // Ray-sphere intersection
    float b    = dot(ro, rd);
    float c    = dot(ro, ro) - 1.0;
    float disc = b * b - c;

    vec3  bgCol    = vec3(0.05, 0.05, 0.08);
    vec3  col      = bgCol;

    if (disc > 0.0) {
        float tNear = -b - sqrt(disc);
        float tFar  = -b + sqrt(disc);

        // Raymarch: discrete approximation of the VRE integral
        const int   STEPS      = 32;
        const float sigma_t    = 0.5;  // extinction coefficient
        const vec3  emit_color = vec3(0.5, 0.7, 1.0);

        float dt = (tFar - tNear) / float(STEPS);
        float T  = 1.0; // transmittance, starts at 1

        for (int i = 0; i < STEPS; i++) {
            // T(s') * sigma_a * L_e * dt  (emission term from VRE)
            float dT  = exp(-sigma_t * dt);
            col      += emit_color * T * (1.0 - dT);
            T        *= dT;

            if (T < 0.01) break;
        }

        // T(s) * L(0)  — background attenuated by remaining transmittance
        col += bgCol * T;
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
    fragColor = vec4(col, 1.0);
}
{{< /glsl >}}

---

## References

- Richard Szeliski, *Computer Vision: Algorithms and Applications*.
- Eric Lengyel, *Mathematics for 3D Game Programming and Computer Graphics*.
- Song Ho Ahn, [OpenGL Projection Matrix](https://www.songho.ca/opengl/gl_projectionmatrix.html).
- Song Ho Ahn, [OpenGL Viewport Transform](https://www.songho.ca/opengl/gl_viewport.html).
- Inigo Quilez, [2D Distance Functions](https://iquilezles.org/articles/distfunctions2d/).
- Inigo Quilez, [3D Distance Functions](https://iquilezles.org/articles/distfunctions/).
- Bui Tuong Phong, *Illumination for Computer Generated Pictures*.
- Turner Whitted, *An Improved Illumination Model for Shaded Display*.
- James Kajiya, *The Rendering Equation*.
- Scratchapixel, [Volume Rendering](https://www.scratchapixel.com/lessons/advanced-rendering/volume-rendering/introduction.html).
- Indian Institute of Science (IISc), [E0 271: Graphics and Visualization](https://www.csa.iisc.ac.in/~vijayn/courses/Graphics/index.html).