---
author: ["Utkarsh Sharma"]
title: "Differentiable Rendering of Participating Media"
date: "2026-07-18"
description: "Differential radiative transfer and gradient estimation for participating media"
summary: "Differentiable rendering theory for volumetric light transport"
tags: ["Differentiable Rendering", "Participating Media", "Radiative Transfer"]
categories: ["computer-graphics", "computer-vision"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
draft: true
---

> **Draft note:** This article assumes the Reynolds Transport Theorem and surface-visibility notation introduced in [Introduction to Differentiable Rendering](/posts/intro-to-differentiable-rendering/). It is kept as a separate draft while the volumetric treatment is being revised.

Surfaces scatter light at boundaries. Participating media scatter and absorb light *inside* a volume: smoke, fog, milk, skin, wax, clouds. The radiative transfer equation (RTE) is the volume analogue of the rendering equation. It is intimidating mostly because it has several physical processes happening at once, so we will keep a simple map in mind:

1. **Transport**: light travels through the medium and is attenuated by transmittance.
2. **Collision/scattering**: particles redirect light from other directions into the ray.
3. **Boundary interaction**: light enters, exits, reflects, or refracts at the medium boundary.
4. **Emission**: the medium or the boundary may add radiance directly.

The differentiable version asks how each of these four pieces changes when a scene parameter $\pi$ changes.

## Radiative Transfer Theory Preliminaries

Radiative transfer uses energy conservation principles to model light transport in participating media. At its core is the *radiative transfer equation* (RTE). Consider a medium confined in a volume $\Omega \subseteq \mathbb{R}^3$ with boundary $\partial \Omega$.

Instead of writing massive nested integrals, it is common to use mathematical *operators* to represent different physical processes. The *steady-state* RTE is a linear integral equation on the radiance field $L$ in the interior of the volume. Physically, it expresses that the radiance at any point is the sum of three contributions: light that was scattered into the path from elsewhere in the volume, light that entered or was reflected/refracted at the medium's outer boundary, and light that was directly emitted by the medium or the boundary. In operator form, we can write this elegantly as:

$$
\begin{equation}
L = \underbrace{{\color{#0f85a5}(\mathcal{K}_T \mathcal{K}_C) L}}_{\text{Volumetric Scattering}} + \underbrace{{\color{#4facfe}\mathcal{K}_S L}}_{\text{Interfacial Scattering}} + \underbrace{{\color{#ff6b6b}L^{(0)}}}_{\text{Radiant Emission}} \label{eq:rte}
\end{equation}
$$

The operators below are just compact names for those physical processes:

**1. The transport operator ($\mathcal{K}_T$).** This models straight-line travel through the medium. It maps any function $g: (\Omega \setminus \partial \Omega) \times \mathbb{S}^2 \to \mathbb{R}_+$ to a ray integral:

$$
\begin{equation}
(\mathcal{K}_T g)(\mathbf{x}, \boldsymbol{\omega}) = \int_0^D T(\mathbf{x}', \mathbf{x}) g(\mathbf{x}', \boldsymbol{\omega}) \mathrm{d}\tau, \label{eq:transport_op}
\end{equation}
$$

where $\mathbf{x}' := \mathbf{x} - \tau\boldsymbol{\omega}$ is a point along the ray, and $D$ is the total distance from $\mathbf{x}$ to the medium's boundary in the direction of $-\boldsymbol{\omega}$:

$$
\begin{equation}
D = \inf\{\tau \in \mathbb{R}_+ \,:\, \mathbf{x} - \tau\boldsymbol{\omega} \in \partial \Omega \}; \label{eq:distance}
\end{equation}
$$

Here, $T(\mathbf{x}', \mathbf{x})$ is the *transmittance*. You can think of transmittance as the probability that light successfully travels the distance between $\mathbf{x}'$ and $\mathbf{x}$ without hitting a particle (being absorbed or scattered away):

$$
\begin{equation}
T(\mathbf{x}', \mathbf{x}) = \exp\left(-\int_0^\tau \sigma_t(\mathbf{x} - \tau'\boldsymbol{\omega}) \mathrm{d}\tau'\right), \label{eq:transmittance}
\end{equation}
$$

with $\sigma_t$ denoting the medium's *extinction coefficient* (how strongly the medium blocks light).

**2. The collision operator ($\mathcal{K}_C$).** This gathers light scattered toward the ray from all other directions. It maps the interior radiance field $L$ to the *in-scattered radiance* ($L^\text{ins}$):

$$
\begin{equation}
(\mathcal{K}_C L)(\mathbf{x}, \boldsymbol{\omega}) = \sigma_s(\mathbf{x}) \underbrace{\int_{\mathbb{S}^2} f_p(\mathbf{x}, -\boldsymbol{\omega}_i, \boldsymbol{\omega}) L(\mathbf{x}, \boldsymbol{\omega}_i) \mathrm{d}\sigma(\boldsymbol{\omega}_i)}_{=: L^\text{ins}(\mathbf{x}, \boldsymbol{\omega})}, \label{eq:collision_op}
\end{equation}
$$

where $\sigma_s$ is the medium's *scattering coefficient* and $f_p$ is the *single-scattering phase function* (which dictates the directional distribution of scattered light, similar to a BSDF for surfaces).

**3. The interfacial scattering operator ($\mathcal{K}_S$).** This handles what happens when light hits the boundary of the medium. It follows the standard surface rendering equation:

$$
\begin{equation}
(\mathcal{K}_S L)(\mathbf{x}, \boldsymbol{\omega}) = T(\mathbf{x}_0, \mathbf{x}) \int_{\mathbb{S}^2} f_s(\mathbf{x}_0, -\boldsymbol{\omega}_i, \boldsymbol{\omega}) L(\mathbf{x}_0, \boldsymbol{\omega}_i) \mathrm{d}\sigma(\boldsymbol{\omega}_i), \label{eq:interfacial_op}
\end{equation}
$$

where $\mathbf{x}_0 := \mathbf{x} - D\boldsymbol{\omega}$ is a point on the medium's boundary.

**4. The emission term ($L^{(0)}$).** The last term on the right-hand side of the RTE $\eqref{eq:rte}$ is the primary emission:

$$
\begin{equation}
L^{(0)}(\mathbf{x}, \boldsymbol{\omega}) := \underbrace{{\color{#0f85a5}(\mathcal{K}_T \sigma_a Q)(\mathbf{x}, \boldsymbol{\omega})}}_{\text{Volumetric Emission}} + \underbrace{{\color{#4facfe}T(\mathbf{x}_0, \mathbf{x}) L_e(\mathbf{x}_0, \boldsymbol{\omega})}}_{\text{Boundary Emission}}, \label{eq:emission_op}
\end{equation}
$$

which accounts for radiant emission inside the medium and from its boundary. Here, $\sigma_a := \sigma_t - \sigma_s$ is the *absorption coefficient*, and $Q$ represents the medium's radiant emission.

## Differential Radiative Transfer

With the forward model defined, we can now ask how the interior radiance $L$ changes when a scene parameter $\pi \in \mathbb{R}$ changes: density, scattering albedo, phase-function parameters, or the boundary shape. We derive $\partial_\pi L := \partial L / \partial \pi$ by differentiating the operators in Eq. $\eqref{eq:rte}$.

**Assumptions.** To keep this intro readable, we follow the common non-emissive-medium simplification and ignore volumetric emission when deriving $\partial_\pi L$. We also assume the medium properties ($\sigma_t, \sigma_s, f_p, f_s, L_e$) are spatially and directionally continuous, and that there are no ideal specular delta events or perfectly sharp light sources. Those cases require additional care.

**Overview.** By applying the linearity of derivatives, the structure of our differential equation breaks down perfectly into three parts:

$$
\begin{equation}
\partial_\pi L = \underbrace{{\color{#0f85a5}\partial_\pi (\mathcal{K}_T \mathcal{K}_C L)}}_{\text{Volumetric Deriv.}} + \underbrace{{\color{#4facfe}\partial_\pi (\mathcal{K}_S L)}}_{\text{Interfacial Deriv.}} + \underbrace{{\color{#ff6b6b}\partial_\pi L^{(0)}}}_{\text{Emission Deriv.}} \label{eq:diff_outline}
\end{equation}
$$

The rest of this section expands these terms. The important intuition is simple: differentiating volumes creates the same two kinds of terms we saw for surfaces, but now they can occur along a ray segment as well as on moving discontinuity curves.

## Differentiation of the Transport and Collision Operators

We start with the first term: $\partial_\pi (\mathcal{K}_T \mathcal{K}_C L)$. By differentiating this combined operator, we account for changes in the medium's density and scattering properties. Expanding this gives us three distinct effects:

$$
\begin{equation}
\begin{aligned}
(\partial_\pi \mathcal{K}_T \mathcal{K}_C L)(\mathbf{x}, \boldsymbol{\omega}) = &\underbrace{{\color{#0f85a5} \int_0^D T(\mathbf{x}', \mathbf{x}) \sigma_s(\mathbf{x}') \partial_\pi L^\text{ins}(\mathbf{x}', \boldsymbol{\omega}) \mathrm{d}\tau }}_{\text{Change in In-scattered Radiance}} \\
&+ \underbrace{{\color{#4facfe} \int_0^D T(\mathbf{x}', \mathbf{x}) \left[ \partial_\pi \sigma_s(\mathbf{x}') - \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, \tau)\sigma_s(\mathbf{x}') \right] L^\text{ins}(\mathbf{x}', \boldsymbol{\omega}) \mathrm{d}\tau }}_{\text{Change in Material \& Transmittance}} \\
&+ \underbrace{{\color{#e69138} \partial_\pi D \, T(\mathbf{x}_0, \mathbf{x}) \sigma_s(\mathbf{x}_0) L^\text{ins}(\mathbf{x}_0, \boldsymbol{\omega}) }}_{\text{Change in Boundary Distance}},
\end{aligned}
\label{eq:diff_transport_collision}
\end{equation}
$$


where $\mathbf{x}' := \mathbf{x} - \tau\boldsymbol{\omega}$ is a point on the ray; $\mathbf{x}_0$ is where the ray hits the boundary; and $\Sigma_t(\mathbf{x}, \boldsymbol{\omega}, \tau)$ represents the accumulated change in extinction along the ray, defined as:

$$
\begin{equation}
\Sigma_t(\mathbf{x}, \boldsymbol{\omega}, \tau) := \int_0^\tau \partial_\pi \sigma_t(\mathbf{x} - \tau'\boldsymbol{\omega}) \mathrm{d}\tau'. \label{eq:sigma_t}
\end{equation}
$$

In Eqs. $\eqref{eq:diff_transport_collision}$ and $\eqref{eq:sigma_t}$, $\partial_\pi \sigma_t$ and $\partial_\pi \sigma_s$ are *material derivatives*. They capture how the medium's properties change if the parameter $\pi$ moves the material itself:

$$
\begin{equation}
\partial_\pi \sigma(\mathbf{x}) = \frac{\partial\sigma}{\partial\pi}(\mathbf{x}) + \langle \partial_\pi \mathbf{x}, \nabla\sigma(\mathbf{x}) \rangle, \label{eq:material_deriv}
\end{equation}
$$

**In-scattered radiance at the boundary.** The last term in Eq. $\eqref{eq:diff_transport_collision}$ requires us to evaluate $L^\text{ins}$ exactly at the boundary point $\mathbf{x}_0$. This needs care because light transport behaves differently depending on whether it is arriving from inside or outside the medium.

We define $L^\text{ins}(\mathbf{x}_0, \boldsymbol{\omega})$ as the limit approaching from the interior. Because of this boundary split, the integral breaks into two hemispheres:

$$
\begin{equation}
\begin{aligned}
L^\text{ins}(\mathbf{x}_0, \boldsymbol{\omega}) = &\int_{\mathbb{H}_+} f_p(\mathbf{x}_0, -\boldsymbol{\omega}', \boldsymbol{\omega}) L(\mathbf{x}_0, \boldsymbol{\omega}') \mathrm{d}\boldsymbol{\omega}' \\
&+ \int_{\mathbb{H}_-} f_p(\mathbf{x}_0, -\boldsymbol{\omega}', \boldsymbol{\omega}) L(\mathbf{x}_0, \boldsymbol{\omega}') \mathrm{d}\boldsymbol{\omega}',
\end{aligned}
\label{eq:ins_boundary}
\end{equation}
$$

where $\mathbb{H}_+$ (pointing outside) and $\mathbb{H}_-$ (pointing inside) are separated by the boundary normal $\mathbf{n}(\mathbf{x}_0)$:

$$
\begin{equation}
\mathbb{H}_+ = \{\boldsymbol{\omega}' \in \mathbb{S}^2 \,:\, \langle \mathbf{n}(\mathbf{x}_0), \boldsymbol{\omega}' \rangle > 0\}, \quad \mathbb{H}_- = \{\boldsymbol{\omega}' \in \mathbb{S}^2 \,:\, \langle \mathbf{n}(\mathbf{x}_0), \boldsymbol{\omega}' \rangle < 0\}. \label{eq:hemispheres}
\end{equation}
$$

{{< figure src="/images/diff-rendering/inscattering.svg" id="fig-rte-boundary" caption="Calculating the in-scattered radiance $L^\text{ins}$ at location $\mathbf{x}_0 \in \partial \Omega$ with direction $\boldsymbol{\omega}$ pointing toward the interior of the medium (illustrated in gray). (a) When $\boldsymbol{\omega}' \in \mathbb{H}_+$ (i.e., pointing toward the exterior of the medium), the interior radiance $L(\mathbf{x}_0, \boldsymbol{\omega}')$ involving a line integral (indicated as the dashed line in green) from the interior is used. (b) When $\boldsymbol{\omega}' \in \mathbb{H}_-$, on the contrary, the interfacial radiance $L(\mathbf{x}_0, \boldsymbol{\omega}')$ from the interior is used. This radiance is in turn determined by interior radiances reflected and refracted by the interface (shown as dashed lines in orange)." width="100%" >}}

## Differentiation of the In-Scattered Radiance

To fully evaluate Eq. $\eqref{eq:diff_transport_collision}$, we also need the derivative of the in-scattered radiance, $\partial_\pi L^\text{ins}$. Because $L(\mathbf{x}, \boldsymbol{\omega}')$ might contain sudden jumps due to occlusions, such as an object moving inside the smoke, we apply the Reynolds Transport Theorem reviewed in the introductory article.

Let $\mathbb{S}(\mathbf{x}) \subset \mathbb{S}^2$ be the set of spherical curves capturing these visual discontinuities. The derivative splits into our familiar interior and boundary components:

$$
\begin{equation}
\begin{aligned}
\partial_\pi L^\text{ins}(\mathbf{x}, \boldsymbol{\omega}) &= \underbrace{{\color{#0f85a5}\int_{\mathbb{S}^2} \partial_\pi \left[ f_p(\mathbf{x}, -\boldsymbol{\omega}', \boldsymbol{\omega}) L(\mathbf{x}, \boldsymbol{\omega}') \right] \mathrm{d}\boldsymbol{\omega}'}}_{\text{Interior Derivative}} \\
&\quad + \underbrace{{\color{#e69138}\int_{\mathbb{S}(\mathbf{x})} \langle \mathbf{n}_\perp, \partial_\pi \boldsymbol{\omega}' \rangle f_p(\mathbf{x}, -\boldsymbol{\omega}', \boldsymbol{\omega}) \Delta L(\mathbf{x}, \boldsymbol{\omega}') \mathrm{d}\ell(\boldsymbol{\omega}')}}_{\text{Boundary Derivative } (B^\text{ins}(\mathbf{x}, \boldsymbol{\omega}))}.
\end{aligned}
\label{eq:diff_ins}
\end{equation}
$$

The interior term is the ordinary derivative of the continuous part; the **Boundary Derivative** ($B^\text{ins}$) is the new piece, capturing the edges of moving objects *inside* the medium.

{{< figure src="/images/diff-rendering/change_of_measure.svg" id="fig-rte-curves" caption="(a) Definitions of $\mathbb{S}(\mathbf{x})$ and $\partial^2\Omega(\mathbf{x})$. (b) Deriving the change-of-measure ratio $\sin\theta/\|\mathbf{y}-\mathbf{x}\|$ in Eq. (36) by projecting a differential curve $\mathrm{d}\mathbf{y}$ to the surface of a unit sphere around $\mathbf{x}$." width="100%" >}}

Computing integrals over spherical curves can be tricky. It is computationally more convenient to rewrite this boundary integral in terms of actual 3D geometric edges in the scene (boundary edges, silhouettes, and sharp edges).

Let $\partial^2 \Omega(\mathbf{x})$ denote all the 3D boundary curves visible from $\mathbf{x}$. By projecting these into 3D space, $B^\text{ins}(\mathbf{x}, \boldsymbol{\omega})$ becomes:

$$
\begin{equation}
\begin{aligned}
B^\text{ins}(\mathbf{x}, \boldsymbol{\omega}) = \int_{\partial^2 \Omega(\mathbf{x})} &\langle \mathbf{n}_\perp, \partial_\pi(\mathbf{y} \to \mathbf{x}) \rangle f_p(\mathbf{x}, \mathbf{y} \to \mathbf{x}, \boldsymbol{\omega}) \\
&\cdot \Delta L(\mathbf{x}, \mathbf{y} \to \mathbf{x}) V(\mathbf{x}, \mathbf{y}) \frac{\sin \theta}{\| \mathbf{y} - \mathbf{x} \|} \mathrm{d}\ell(\mathbf{y}),
\end{aligned}
\label{eq:diff_ins_3d}
\end{equation}
$$

where $\mathbf{y} \to \mathbf{x}$ is the direction from point $\mathbf{y}$ on the edge to $\mathbf{x}$, $V(\mathbf{x}, \mathbf{y})$ is the mutual visibility, and $\theta$ is the angle of the edge.

To compute this term, we need three geometric ingredients:

{{< figure src="/images/diff-rendering/normals.svg" id="fig-rte-normals" caption="Normals of spherical discontinuity curves obtained by projecting line segments and spheres." width="100%">}}

1.  **Normal ($\mathbf{n}_\perp$):** The normal vector of the discontinuity boundary (see {{< figref "fig-rte-normals" >}} ). For an edge between endpoints $\mathbf{p}$ and $\mathbf{q}$:
    $$
    \begin{equation}
    \mathbf{n}_\perp = \frac{(\mathbf{p} - \mathbf{x}) \times (\mathbf{q} - \mathbf{x})}{\| (\mathbf{p} - \mathbf{x}) \times (\mathbf{q} - \mathbf{x}) \|}. \label{eq:normal}
    \end{equation}
    $$


2.  **Change rate ($\partial_\pi \boldsymbol{\omega}'$):** How fast the edge direction changes as the parameter $\pi$ changes:
    $$
    \begin{equation}
    \partial_\pi \boldsymbol{\omega}' = \partial_\pi \left( \frac{\mathbf{x} - \mathbf{y}}{\| \mathbf{x} - \mathbf{y} \|} \right) = \frac{\partial_\pi \mathbf{x} - \partial_\pi \mathbf{y}}{\| \mathbf{x} - \mathbf{y} \|} - \boldsymbol{\omega}' \left\langle \boldsymbol{\omega}', \frac{\partial_\pi \mathbf{x} - \partial_\pi \mathbf{y}}{\| \mathbf{x} - \mathbf{y} \|} \right\rangle. \label{eq:change_rate}
    \end{equation}
    $$

3.  **Color Jump ($\Delta L$):** The difference in radiance across the boundary, evaluated via two infinitesimally close rays on either side of the edge:
    $$
    \begin{equation}
    \Delta L(\mathbf{x}, \boldsymbol{\omega}') = \lim_{\epsilon \to 0^-} L(\mathbf{x}, \boldsymbol{\omega}' + \epsilon \mathbf{n}_\perp) - \lim_{\epsilon \to 0^+} L(\mathbf{x}, \boldsymbol{\omega}' + \epsilon \mathbf{n}_\perp). \label{eq:delta_L}
    \end{equation}
    $$

## Differentiation of the Interfacial Scattering Operator

We now move to the second main term in our outline Eq. $\eqref{eq:diff_outline}$: the derivative of the interfacial scattering $\mathcal{K}_S L$. This measures how light reflection/transmission at the medium's outer boundary changes. Differentiating $(\mathcal{K}_S L)(\mathbf{x}, \boldsymbol{\omega}) = T(\mathbf{x}_0, \mathbf{x}) L_r(\mathbf{x}_0, \boldsymbol{\omega})$ using the product rule yields:

$$
\begin{equation}
\begin{aligned}
\partial_\pi (\mathcal{K}_S L)(\mathbf{x}, \boldsymbol{\omega}) &= \partial_\pi[T(\mathbf{x}_0, \mathbf{x}) L_r(\mathbf{x}_0, \boldsymbol{\omega})] \\
&= T(\mathbf{x}_0, \mathbf{x}) \partial_\pi L_r(\mathbf{x}_0, \boldsymbol{\omega}) + \partial_\pi T(\mathbf{x}_0, \mathbf{x}) L_r(\mathbf{x}_0, \boldsymbol{\omega}) \\
&= T(\mathbf{x}_0, \mathbf{x}) \left[ - \left( \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, D) + \partial_\pi D \, \sigma_t(\mathbf{x}_0) \right) L_r(\mathbf{x}_0, \boldsymbol{\omega}) + \partial_\pi L_r(\mathbf{x}_0, \boldsymbol{\omega}) \right].
\end{aligned}
\label{eq:diff_interfacial}
\end{equation}
$$

The derivative of the transmittance to the boundary $\partial_\pi T(\mathbf{x}_0, \mathbf{x})$ gives:

$$
\begin{equation}
\partial_\pi T(\mathbf{x}_0, \mathbf{x}) = -T(\mathbf{x}_0, \mathbf{x}) \left( \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, D) + \partial_\pi D \, \sigma_t(\mathbf{x}_0) \right), \label{eq:diff_transmittance_boundary}
\end{equation}
$$

where the term $\partial_\pi D \, \sigma_t(\mathbf{x}_0)$ appears because if the boundary of the medium moves, the total travel distance $D$ inside the medium changes.

Just like the in-scattered radiance earlier, the term $\partial_\pi L_r(\mathbf{x}_0, \boldsymbol{\omega})$ represents the derivative of reflected light at the boundary, which also splits into continuous and discontinuous (boundary) components:

$$
\begin{equation}
\begin{aligned}
\partial_\pi L_r(\mathbf{x}, \boldsymbol{\omega}) &= \underbrace{{\color{#0f85a5}\int_{\mathbb{S}^2} \partial_\pi \left[ f_s(\mathbf{x}, -\boldsymbol{\omega}', \boldsymbol{\omega}) L(\mathbf{x}, \boldsymbol{\omega}') \right] \mathrm{d}\boldsymbol{\omega}'}}_{\text{Interior Derivative}} \\
&\quad + \underbrace{{\color{#e69138}\int_{\partial^2 \Omega(\mathbf{x})} \langle \mathbf{n}_\perp, \partial_\pi (\mathbf{y} \to \mathbf{x}) \rangle f_s(\mathbf{x}, \mathbf{y} \to \mathbf{x}, \boldsymbol{\omega}) \Delta L(\mathbf{x}, \mathbf{y} \to \mathbf{x}) V(\mathbf{x}, \mathbf{y}) \frac{\sin \theta}{\| \mathbf{y} - \mathbf{x} \|} \mathrm{d}\ell(\mathbf{y})}}_{\text{Boundary Derivative}},
\end{aligned}
\label{eq:diff_L_r}
\end{equation}
$$

## Completing $\partial_\pi L$

The final term is the derivative of the emission, $L^{(0)} = T L_e$. By replacing the reflected radiance $L_r$ from Eq. $\eqref{eq:diff_interfacial}$ with the emitted radiance $L_e$, we get:

$$
\begin{equation}
\begin{aligned}
\partial_\pi L^{(0)}(\mathbf{x}, \boldsymbol{\omega}) &= \partial_\pi[T(\mathbf{x}_0, \mathbf{x}) L_e(\mathbf{x}_0, \boldsymbol{\omega})] \\
&= T(\mathbf{x}_0, \mathbf{x}) \left[ - \left( \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, D) + \partial_\pi D \, \sigma_t(\mathbf{x}_0) \right) L_e(\mathbf{x}_0, \boldsymbol{\omega}) + \partial_\pi L_e(\mathbf{x}_0, \boldsymbol{\omega}) \right].
\end{aligned}
\label{eq:diff_emission}
\end{equation}
$$

**Putting it all together.** We now combine everything to get $\partial_\pi L$, the total scene derivative of the interior radiance. By adding the interfacial scattering and emission derivatives together, we get the derivative of the "source" term $Q$:

$$
\begin{equation}
\begin{aligned}
\partial_\pi Q(\mathbf{x}, \boldsymbol{\omega}) &= \left( \partial_\pi (\mathcal{K}_S L) + \partial_\pi L^{(0)} \right) (\mathbf{x}, \boldsymbol{\omega}) \\
&= T(\mathbf{x}_0, \mathbf{x}) \left[ - \left( \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, D) + \partial_\pi D \, \sigma_t(\mathbf{x}_0) \right) L(\mathbf{x}_0, \boldsymbol{\omega}) + \partial_\pi L(\mathbf{x}_0, \boldsymbol{\omega}) \right].
\end{aligned}
\label{eq:diff_Q}
\end{equation}
$$

Finally, adding the volumetric component Eq. $\eqref{eq:diff_transport_collision}$ to Eq. $\eqref{eq:diff_Q}$ completes the derivation. The full equation separates into volumetric, interfacial, and moving-boundary components:

$$
\begin{equation}
\begin{aligned}
\partial_\pi L(\mathbf{x}, \boldsymbol{\omega}) = &\underbrace{{\color{#0f85a5}\int_0^D T(\mathbf{x}', \mathbf{x}) \left[ \sigma_s(\mathbf{x}') \partial_\pi L^\text{ins}(\mathbf{x}', \boldsymbol{\omega}) + \left( \partial_\pi \sigma_s(\mathbf{x}') - \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, \tau)\sigma_s(\mathbf{x}') \right) L^\text{ins}(\mathbf{x}', \boldsymbol{\omega}) \right] \mathrm{d}\tau}}_{\text{Volumetric Component}} \\
&+ \underbrace{{\color{#4facfe}T(\mathbf{x}_0, \mathbf{x}) \left[ - \left( \Sigma_t(\mathbf{x}, \boldsymbol{\omega}, D) + \partial_\pi D \, \sigma_t(\mathbf{x}_0) \right) L(\mathbf{x}_0, \boldsymbol{\omega}) + \partial_\pi L(\mathbf{x}_0, \boldsymbol{\omega}) \right]}}_{\text{Interfacial Component}} \\
&+ \underbrace{{\color{#e69138}T(\mathbf{x}_0, \mathbf{x}) \partial_\pi D \, \sigma_s(\mathbf{x}_0) L^\text{ins}(\mathbf{x}_0, \boldsymbol{\omega})}}_{\text{Boundary Moving Component}}.
\end{aligned}
\label{eq:diff_L_final}
\end{equation}
$$

The takeaway is that differential radiative transfer is not a new kind of physics. It is the same conservation-of-energy story as ordinary radiative transfer, but every term gets a derivative companion: material changes along the ray, transmittance changes along the ray, scattering changes at interior points, and visibility changes on moving boundaries.
