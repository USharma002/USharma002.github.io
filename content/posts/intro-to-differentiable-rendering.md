---
author: ["Utkarsh Sharma"]
title: "Introduction to Differentiable Rendering"
date: "2026-05-29"
description: "An introduction to Differentiable rendering techniques for computer graphics and vision"
summary: "Differentiable rendering techniques for computer graphics and vision"
tags: ["Differentiable Rendering", "Computer Graphics"]
categories: ["machine-learning", "computer-vision", "computer-graphics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

# Introduction to Differentiable Rendering

The idea behind differentiable rendering is to compute gradients of the rendering process with respect to scene parameters, such as geometry, materials, and lighting. Having access to these gradients can allow us to pose rendering as an optimization problem, where we can optimize those parameters to minimize some loss function (like MSE between the render and ground truth image). This is useful when we want to reconstruct or match a scene from images, optimize geometry for some task, etc.

But before we look at **Differentiable Rendering**, let's look at methods to calculate derivatives of a function. I will assume prior knowledge of Physically Based Rendering (PBR) and the rendering equation, so I won't go into details of those topics here. I have a post for that if interested.

## Differentiation Methods


### Finite Differences and Simultaneous Perturbation
The simple gradient computation method is finite differences (FD). It numerically approximates the derivative of a scalar function $f:\mathbb{R}^n \to \mathbb{R}$ at a point $x$ as:

$$
f'(x) \approx \frac{f(x + h) - f(x)}{h}
$$

where $h$ is a small step size. A commonly used variant is the central difference method, which provides a better approximation:

$$
f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}
$$


<div class="paper-fig-row">
  <div>
    {{< figure src="/images/diff-rendering/svgtex/finite-difference.svg" id="fig-finite-difference" caption="(a) Finite Difference" width="100%" >}}
  </div>
  <div>
    {{< figure src="/images/diff-rendering/svgtex/central-difference.svg" id="fig-central-difference" caption="(b) Central Difference" width="100%" >}}
  </div>
</div>

Finite differences are biased as they evaluate a blurred version of the true derivative:

$$
\frac{f(x + h) - f(x - h)}{2h} = \frac{1}{2h} \int_{-h}^{h} f'(x + t) dt = \int_{-\infty}^{\infty} K(t - x)f'(t) dt
$$

where $K(t)$ is a kernel function that represents the blurring effect of the finite difference approximation. 
This blurring can cause the finite difference method to produce inaccurate gradients, especially when the function $f$ has high-frequency components or is not smooth. This effect becomes negligible as $h$ approaches zero. By progressively reducing the step size $h$ one can construct an unbiased  gradient estimator, but this comes at significant cost of evaluating the FD estimator many times.

It is straightforward to apply finite differences to a renderer by generating the image once with the original and once with the perturbed parameter. When using a Monte Carlo renderer, the evaluation of $f$ will be noisy. If $f(x + h)$ and $f(x)$ are evaluated independently, the FD estimator requires an enormous number of Monte Carlo samples to converge. The issue can easily be resolved by using the same random number generator seed for both evaluations. The correlation of the two estimators then causes a significant part of the variance to cancel out.

Fundamentally, the main problem of the finite differences is that they cannot scale to functions with many input parameters. For inverse rendering, we would need to render the image twice for *each* parameter ($f(x_1, ..., x_i, ...)$ and $f(x_1, ..., x_i + h, ...)$). This is completely impractical for most real use cases. An alternative is *simultaneous perturbation*, which is a stochastic estimator that estimates high-dimensional gradients by simultaneously offsetting all parameters.

For $f: \mathbb{R}^n \to \mathbb{R}$, the simultaneous perturbation method estimates the gradient as:
$$
\partial f(x) \approx \frac{f(x + h \cdot \Delta) - f(x - h \cdot \Delta)}{2h} \cdot \Delta^{-1}
$$

where $\Delta$ is a random perturbation vector with entries drawn from a symmetric distribution (e.g., Bernoulli or Gaussian). This method requires only two function evaluations, regardless of the dimensionality of the input space, making it much more efficient for high-dimensional problems. However, it can introduce additional variance into the gradient estimates, which may require careful tuning of the step size $h$ and the distribution of $\Delta$ to achieve good convergence, thus harming optimization performance. This and related *derivative-free* optimization methods cannot compete with gradient descent using the true infinitesimal gradient.


### Automatic Differentiation

Instead of finite differences or analytic gradients, we typically want to use some form of *automatic differentiation* (AD). These methods compute gradients automatically by leveraging the chain rule to decompose the derivative of a computation into a Jacobian product:
$$
\partial_x g(f(\mathbf{x})) = J_g(f(\mathbf{x})) \cdot J_f(\mathbf{x}) = \partial_f g(f(\mathbf{x})) \cdot \partial_x f(\mathbf{x})
$$

where $J_g(f(\mathbf{x}))$ is the Jacobian of $g$ evaluated at $f(\mathbf{x})$, and $J_f(\mathbf{x})$ is the Jacobian of $f$ evaluated at $\mathbf{x}$.

{{< 
figure src="/images/diff-rendering/svgtex/auto-diff.svg"
id="fig-auto-diff-graph"
caption="Example computation graph corresponding to the expression $x^2 \operatorname{sin}(2xy)$. The edge weights are the derivative of the operation applied to the input node."
width="100%" 
>}}

This principle enables scalable derivative computation that supports an arbitrary number of input variables. Automatic differentiation was initially introduced between the 1950s and 1970s, and then later gained significant traction thanks to its application to training neural networks. The following overview of AD discusses the basic principles and outlines some of the main constraints posed by the inverse rendering problem. A nice implementation of this concept by Andrej Karpathy can be found on YouTube [here](https://www.youtube.com/watch?v=VMj-3S1tku0)

**Computation graphs**. The central idea is to think of a given computation as a graph of operations. The individual operations are nodes and the derivatives of individual steps are assigned to the graph's edges. For example, consider the following expression: 

$$
\begin{equation}
x^2 \operatorname{sin}(2xy) \label{eq:forward-mode}
\end{equation}
$$

In a computer program, we could implement the evaluation of this expression as a sequence of steps:
```python
a = 2 * x
b = a * y
c = sin(b)
d = x * x
e = x * d
```

The corresponding computation graph is shown in {{< figref "fig-auto-diff-graph" >}}. The weight of the edge $a \rightarrow b$ between nodes $a$ and $b$ is the derivative $\partial b /\partial a$. An implementation of AD can compute these edge weights during the forward computation. The forward computation will henceforth also be referred to as *primal* computation. Many quantities used in the edge weights are redundant with the primal computations. The stored weights then allow to efficiently compute variable gradients. The stored graph of operations is sometimes also referred to as a *tape* or *Wengert tape*.

#### Forward-mode differentiation

**Forward-mode differentiation.** A key choice in AD algorithms is the *directionality* of the gradient computation. The stored computation graph can be traversed either in forward or reverse direction. If the computation has a single differentiable input variable, but many outputs, it is efficient to evaluate gradients from the variable to the output in the *forward* direction. Mathematically, the differentiation turns into a series of Jacobian Vector Products (JVP). For a function $f: \mathbb{R}^n \to \mathbb{R}^m$, the forward-mode AD computes the output gradient $\partial_{\mathbf{y}}$ as the product of the Jacobian $\mathbf{J}_f$ with the input gradient $\partial_{\mathbf{x}}$:
$$
\partial_{\mathbf{y}} = \mathbf{J}_f \cdot \partial_{\mathbf{x}}
$$

Here and in the following, we use $\delta$ to denote the vectors that are inputs and output of the Jacobian products.

We can apply forward-mode AD to differentiate the output of Equation $\eqref{eq:forward-mode}$ with respect to the input variable $x$. We initialize the variable $\delta x = 1$ and then traverse the graph in {{< figref "fig-auto-diff-graph" >}} from left to right, in each step multiplying the derivative value by the stored edge weights. The interactive simulation below traces this process step-by-step:

{{< step-slider animate="false" >}}

- image: "/images/diff-rendering/svgtex/forward_ad/step-01svg.svg"
  title: "Initialize Primal"
  description: |
    <div class="eq-stack">
    We start with input values $x=2, y=3$ and compute the forward pass.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-02svg.svg"
  title: 'Seed Gradient $\nabla_x$'
  description: |
    <div class="eq-stack">
    To compute $\frac{\partial}{\partial x}$, we seed the input gradient $\nabla_x = 1.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-03svg.svg"
  title: 'Compute $\nabla_x(2x)$'
  description: |
    <div class="eq-stack">
    $\nabla_x(2x) = \nabla_x \cdot 2 = 2.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-04svg.svg"
  title: 'Compute $\nabla_x(2xy)$'
  description: |
    <div class="eq-stack">
    $\nabla_x(2xy) = \nabla_x(2x) \cdot y = 2 \cdot 3 = 6.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-05svg.svg"
  title: 'Compute $\nabla_x(\sin(2xy))$'
  description: |
    <div class="eq-stack">
    $\nabla_x(\sin) = \nabla_x(2xy) \cdot \cos(2xy) = 6 \cdot 0.84 = 5.06$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-06svg.svg"
  title: 'Compute $\nabla_x(x^2)$'
  description: |
    <div class="eq-stack">
    $\nabla_x(x^2) = \nabla_x \cdot 2x = 1 \cdot 4 = 4.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-07svg.svg"
  title: "Final Output Gradient"
  description: |
    <div class="eq-stack">
    $\nabla_x(f) = \nabla_x(x^2)\sin + x^2\nabla_x(\sin) = 4(-0.54) + 4(5.06) = 18.11$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-08svg.svg"
  title: 'Reset for $\nabla_y$'
  description: |
    <div class="eq-stack">
    Now we repeat the process to find the gradient with respect to $y$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-09svg.svg"
  title: 'Seed Gradient $\nabla_y$'
  description: |
    <div class="eq-stack">
    Set $\nabla_y = 1.0$ and $\nabla_x = 0.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-10svg.svg"
  title: 'Compute $\nabla_y(2x)$'
  description: |
    <div class="eq-stack">
    $\nabla_y(2x) = 0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-11svg.svg"
  title: 'Compute $\nabla_y(2xy)$'
  description: |
    <div class="eq-stack">
    $\nabla_y(2xy) = \nabla_y(2x) \cdot y + 2x \cdot \nabla_y = 0 \cdot 3 + 4 \cdot 1 = 4.0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-12svg.svg"
  title: 'Compute $\nabla_y(\sin(2xy))$'
  description: |
    <div class="eq-stack">
    $\nabla_y(\sin) = \nabla_y(2xy) \cdot \cos(2xy) = 4 \cdot 0.84 = 3.38$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-13svg.svg"
  title: 'Compute $\nabla_y(x^2)$'
  description: |
    <div class="eq-stack">
    $\nabla_y(x^2) = 0$.
    </div>

- image: "/images/diff-rendering/svgtex/forward_ad/step-14svg.svg"
  title: 'Final Output Gradient $\nabla_y$'
  description: |
    <div class="eq-stack">
    $\nabla_y(f) = \nabla_y(x^2)\sin + x^2\nabla_y(\sin) = 0 + 4(3.38) = 13.50$.
    </div>

{{< /step-slider >}}

In the end, the variable $\delta e$ contains the desired gradient $\partial e / \partial x$. Using the computation graph, we can differentiate an arbitrary sequence of elementary operations, without explicitly computing and storing the full Jacobian matrix $\mathbf{J}_f$. The computational cost of forward-mode AD is proportional to the number of input variables, which makes it efficient for functions with a small number of inputs and many outputs.

Forward-mode differentiation can be formalized by using *dual numbers*. Similar to a complex number, a dual number $a + \epsilon b$ consists of a real part $a$ and a dual part $b$, where $\epsilon^2 = 0$. Hence, the product of two dual numbers is given by:
$$
(a + \epsilon b)(c + \epsilon d) = ac + \epsilon (ad + bc).
$$
For a function $f: \mathbb{R} \to \mathbb{R}$, we can use a Taylor expansion around $a$ to see that $f(a + \epsilon b) = f(a) + \epsilon b f'(a)$. All the higher-order terms contain a factor of $\epsilon^2$ and hence vanish. This means that the dual part of the result contains the desired derivative $b f'(a)$. By using dual numbers as inputs to a function, we can compute the function's output and its derivative simultaneously. This is the basis of forward-mode AD.

The main issue with forward-mode differentiation is that the entire derivative computation needs to be carried out separately for *each* input variable. Similar to finite differences, this does not scale to the large number of input parameters for inverse rendering.

#### Forward AD code example

Here is the code for the above example:

```python
import math

class Dual:
    def __init__(self, real, dual):
        self.real = real
        self.dual = dual

    def __add__(self, other):
        # Handle addition with a normal scalar number
        other_real = other.real if isinstance(other, Dual) else other
        other_dual = other.dual if isinstance(other, Dual) else 0.0
        return Dual(self.real + other_real, self.dual + other_dual)

    def __mul__(self, other):
        # Handle multiplication with a normal scalar number
        other_real = other.real if isinstance(other, Dual) else other
        other_dual = other.dual if isinstance(other, Dual) else 0.0
        
        # (a + eb) * (c + ed) = (ac) + e(ad + bc)
        real = self.real * other_real
        dual = self.real * other_dual + self.dual * other_real
        return Dual(real, dual)
        
    def __rmul__(self, other):
        # Allows us to do 2 * Dual(...)
        return self.__mul__(other)

    def __repr__(self):
        return f"Dual(val={self.real:.4f}, grad={self.dual:.4f})"

# We define a custom sine function using the dual number Taylor expansion:
# sin(a + eb) = sin(a) + eb * cos(a)
def dual_sin(x):
    if isinstance(x, Dual):
        return Dual(math.sin(x.real), x.dual * math.cos(x.real))
    return math.sin(x)


x = Dual(2.0, dual=1.0) # Seed the derivative here!
y = Dual(3.0, dual=0.0)

# The forward pass
a = 2 * x
b = a * y
c = dual_sin(b)
d = x * x
e = d * c

print("Result:", e)
# Output: Result: Dual(val=-2.1463, grad=18.1062)
```

#### Reverse-mode differentiation
**Reverse-mode differentiation.** The solution to the scaling limitation of forward-mode is to traverse the computation graph in reverse order. Given a sequence of operations, reverse-mode AD starts by evaluating the chain rule for the last operation and proceeds toward the inputs. Mathematically, this evaluates **vector-Jacobian products (VJP)** from the output end of the computation. For a function $f$, it evaluates:
$$
\delta \mathbf{x} = \delta \mathbf{y}^T \mathbf{J}_f
$$
The primary advantage is that the gradient computation no longer needs to be duplicated for each input variable. We can simultaneously compute gradients with respect to both $x$ and $y$ at almost no extra cost. This evaluation order is identical to the **backpropagation** algorithm used in deep learning.

While conceptually simple, reverse-mode AD is generally more difficult to implement than forward-mode. Because it propagates gradients in the opposite order of the primal program, it requires storing the program state or edge weights of the computation graph in memory (often called a *Wengert tape*). 

A naïve implementation that doesn't store weights would require re-running the primal computation for every node, leading to quadratic complexity. Conversely, storing the entire graph can easily exceed system memory for complex simulations. The standard remedy is **checkpointing**, where the program state is only stored at a sparse set of points. Derivative terms are then recomputed locally between these checkpoints during the backward traversal. As we will see, even checkpointing is often insufficient for physically-based differentiable rendering, requiring more specialized solutions.

{{< step-slider animate="false" >}}

- image: "/images/diff-rendering/svgtex/backward_ad/step-01svg.svg"
  title: "Primal Result"
  description: |
    <div class="eq-stack">
    We first compute the primal result $e = -2.15$ in a forward pass.
    </div>

- image: "/images/diff-rendering/svgtex/backward_ad/step-02svg.svg"
  title: "Initialize Adjoint"
  description: |
    <div class="eq-stack">
    We start by setting the adjoint of the output $\bar{e} = 1.0$.
    </div>

- image: "/images/diff-rendering/svgtex/backward_ad/step-03svg.svg"
  title: 'Backprop to $\sin$ and $x^2$'
  description: |
    <div class="eq-stack">
    $\bar{\sin} = \bar{e} \cdot x^2 = 4.0$, and $\bar{x^2} = \bar{e} \cdot \sin = -0.54$.
    </div>

- image: "/images/diff-rendering/svgtex/backward_ad/step-04svg.svg"
  title: "Backprop to $2xy$"
  description: |
    <div class="eq-stack">
    $\bar{2xy} = \bar{\sin} \cdot \cos(2xy) = 4 \cdot 0.84 = 3.38$.
    </div>

- image: "/images/diff-rendering/svgtex/backward_ad/step-05svg.svg"
  title: "Backprop to $2x$ and $y$"
  description: |
    <div class="eq-stack">
    $\bar{2x} = \bar{2xy} \cdot y = 10.08$, and $\bar{y} = \bar{2xy} \cdot 2x = 13.50$.
    </div>

- image: "/images/diff-rendering/svgtex/backward_ad/step-06svg.svg"
  title: "Final Gradient for $x$"
  description: |
    <div class="eq-stack">
    $\bar{x} = \bar{x^2} \cdot 2x + \bar{2x} \cdot 2 = (-0.54 \cdot 4) + (10.08 \cdot 2) = 18.11$.
    </div>

{{< /step-slider >}}

#### Backward AD code example

```python
import math

class Var:
    def __init__(self, val, _children=()):
        self.val = val
        self.grad = 0.0
        # Store the edges of the DAG
        self._prev = set(_children)
        self._backward = lambda: None

    def __mul__(self, other):
        other = other if isinstance(other, Var) else Var(other)
        # Pass (self, other) as children to the new output node
        out = Var(self.val * other.val, (self, other))

        def _backward():
            self.grad += other.val * out.grad
            other.grad += self.val * out.grad
        out._backward = _backward
        
        return out

    def __rmul__(self, other):
        return self * other

    def backward(self):
        # 1. Topological sort using DFS
        topo = []
        visited = set()
        
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
                
        build_topo(self)
        
        # 2. Seed the output gradient
        self.grad = 1.0
        
        # 3. Apply chain rule to the sorted graph in reverse
        for node in reversed(topo):
            node._backward()

    def __repr__(self):
        return f"Var(val={self.val:.4f}, grad={self.grad:.4f})"

def var_sin(x):
    # Pass (x,) as the child
    out = Var(math.sin(x.val), (x,))
    
    def _backward():
        x.grad += math.cos(x.val) * out.grad
    out._backward = _backward
    
    return out


x = Var(2.0)
y = Var(3.0)

# Forward pass builds the DAG automatically in the background
a = 2 * x
b = a * y
c = var_sin(b)
d = x * x
e = d * c

# A single call handles the DFS and the entire backward pass
e.backward()

print("Result e:", e)
print("Grad x:", x)
print("Grad y:", y)

# Output:
# Result e: Var(val=-2.1463, grad=1.0000)
# Grad x: Var(val=2.0000, grad=18.1062)
# Grad y: Var(val=3.0000, grad=13.5016)
```

## Why is Differentiable Rendering Difficult?

While Automatic Differentiation (AD) is a powerful tool for optimizing mathematical functions, it faces a fundamental challenge when applied to rendering. In many cases, **symbolically differentiating a Monte Carlo estimator path tracer does not always work.**

As stated in the SIGGRAPH 2020 course notes on Physically Based Differentiable Rendering:
> *"The problem arises when we try to differentiate an integral whose integrand is discontinuous, or when the sampling process depends on the parameters we are optimizing."*

### The Illegal Swap

The core of the issue lies in the interchange of the derivative and the integral. In calculus, we often assume that:
$$\frac{d}{dp}\int f(x,p)\,dx = \int \frac{\partial f}{\partial p}(x,p)\,dx$$

However, this "Leibniz rule" (switching the order of differentiation and integration) is only valid when $f$ is **continuous** with respect to $p$. In rendering, this condition is frequently violated due to **visibility**—when an object moves, it creates a discontinuity (an edge) where the color jumps from one value to another.

### Example 1: Distributional Parameters

A common pitfall in differentiable rendering is the inconsistent treatment of the sampling process and the PDF differentiation. To illustrate this, consider estimating the derivative of an integral over an infinite domain.

<div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1.5rem; align-items: start; margin: 2rem 0; border: 1px solid var(--border); border-radius: 12px; background: var(--code-bg); padding: 1.25rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden;">
<div>
<h4 style="margin-top: 0; color: #ff6b6b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">Inconsistent (Biased)</h4>

<p style="font-size: 0.82rem; margin: 0 0 0.5rem;">Estimate \(\displaystyle\frac{d}{d\lambda} \int_0^\infty f(\lambda, x)\, dx = \int_0^\infty \frac{\partial f}{\partial \lambda}(\lambda, x)\, dx\)</p>

<p style="font-size: 0.82rem; margin: 0.75rem 0 0.4rem;">(Single-sample) Monte Carlo estimator:</p>
<ul style="font-size: 0.82rem; margin: 0; padding-left: 1.2rem;">
<li>Draw \(x \sim \text{Exp}[\lambda]\) &nbsp;<span style="color: #888; font-size: 0.78rem;">\(x\) has zero gradient</span></li>
<li>\(f' \leftarrow \frac{\partial f}{\partial \lambda}(\lambda, x)\)</li>
<li>\(p \leftarrow \lambda e^{-\lambda x}\) &nbsp;<span style="color: #888; font-size: 0.78rem;">\(p\) is NOT differentiated</span></li>
<li><strong>Return \(f'/p\)</strong></li>
</ul>
</div>

<div style="width: 1px; background: var(--border); align-self: stretch;"></div>

<div>
<h4 style="margin-top: 0; color: var(--secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">Consistent (Unbiased)</h4>

<p style="font-size: 0.82rem; margin: 0 0 0.5rem;">Estimate \(\displaystyle\frac{d}{d\lambda} \int_0^\infty f(\lambda, x)\, dx = \int_0^1 \frac{\partial}{\partial \lambda} \frac{f(\lambda, x)}{\lambda \xi}\, d\xi\)</p>

<p style="font-size: 0.82rem; margin: 0.75rem 0 0.4rem;">(Single-sample) Monte Carlo estimator:</p>
<ul style="font-size: 0.82rem; margin: 0; padding-left: 1.2rem;">
<li>Draw \(\xi \sim U[0,1)\)</li>
<li>\(x \leftarrow -\log(\xi)/\lambda\) &nbsp;<span style="color: #888; font-size: 0.78rem;">\(x\) has nonzero gradient</span></li>
<li>\(f \leftarrow f(\lambda, x)\)</li>
<li>\(p \leftarrow \lambda e^{-\lambda x}\) &nbsp;<span style="color: #888; font-size: 0.78rem;"># \(p = \lambda\xi\)</span></li>
<li><strong>Return \(\partial(f/p)/\partial\lambda\)</strong> &nbsp;<span style="color: #888; font-size: 0.78rem;">\(f\) and \(p\) both differentiated</span></li>
</ul>
</div>
</div>

<div style="margin: 0 auto 2rem; padding: 0.75rem 1.25rem; border: 2px solid var(--border); border-radius: 8px; text-align: center; max-width: 460px; font-size: 0.9rem;">
Whether to differentiate the <em>sampling</em> and the <em>pdf</em> should be <strong>consistent</strong>!
</div>

**What goes wrong in the biased case?** Think of $\lambda$ as controlling the shape of the exponential distribution we sample from. When we draw $x \sim \text{Exp}[\lambda]$ and then ask "how does $f$ change with $\lambda$?", we are only asking how the *value* of $f$ changes — completely ignoring the fact that the *sample location* $x$ itself shifts when $\lambda$ changes. It is like measuring how your shadow changes in length while pretending your body did not move. The consistent approach fixes this by reparameterizing: instead of sampling $x$ directly, we draw a raw uniform $\xi$ and transform it into $x = -\log(\xi)/\lambda$. Now $x$ explicitly depends on $\lambda$, so AD correctly accounts for both how $f$ changes *and* how the sample location moves.

---

### Example 2: Discontinuities (The Visibility Problem)

For discontinuous integrands, the fundamental challenge is that the derivative and the integral cannot simply be swapped. Standard Monte Carlo sampling "misses" the boundary contribution entirely.

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; align-items: start; margin: 2rem 0; border: 1px solid var(--border); border-radius: 12px; background: var(--code-bg); padding: 1.25rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden;">

<div>
<h4 style="margin-top: 0; color: var(--secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">Value Estimator</h4>

<p style="font-size: 0.82rem; margin: 0 0 0.5rem;">Estimate \(\displaystyle\int_0^1 (x < p\ ?\ 1 : 0.5)\ dx,\quad 0 < p < 1\)</p>

<p style="font-size: 0.82rem; margin: 0.5rem 0 0.4rem;">(Single-sample) Monte Carlo estimator:</p>
<ul style="font-size: 0.82rem; margin: 0; padding-left: 1.2rem;">
<li>Draw \(X \sim U[0, 1)\)</li>
<li><strong>Return</strong> \(X < p\ ?\ 1 : 0.5\)</li>
</ul>

<div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
<strong style="display: block; margin-bottom: 0.3rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08rem;">Ground-truth:</strong>
<p style="font-size: 0.82rem; margin: 0;">\(\displaystyle\int_0^1 (x < p\ ?\ 1 : 0.5)\ dx = \int_0^p dx + \int_p^1 0.5\, dx = \frac{1+p}{2}\)</p>
</div>
</div>


<div>
<h4 style="margin-top: 0; color: #ff6b6b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">Derivative Estimator</h4>

<p style="font-size: 0.82rem; margin: 0 0 0.5rem;">Estimate \(\displaystyle\frac{d}{dp}\int_0^1 (x < p\ ?\ 1 : 0.5)\ dx\)</p>

<p style="font-size: 0.82rem; margin: 0.5rem 0 0.4rem;">(Single-sample) Monte Carlo estimator:</p>
<ul style="font-size: 0.82rem; margin: 0; padding-left: 1.2rem;">
<li>Draw \(X \sim U[0, 1)\)</li>
<li><strong>Return</strong> \(\frac{d}{dp}(X < p\ ?\ 1 : 0.5)\) &nbsp;<span style="color: #ff6b6b;">Zero! (constant)</span></li>
</ul>

<div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
<strong style="display: block; margin-bottom: 0.3rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08rem;">Ground-truth:</strong>
<p style="font-size: 0.82rem; margin: 0;">\(\displaystyle\frac{d}{dp} \int_0^1 (x < p\ ?\ 1 : 0.5)\ dx = \frac{d}{dp}\frac{1+p}{2} = \frac{1}{2}\)</p>
</div>
</div>
</div>

**What goes wrong?** The function $f(x, p) = (x < p\ ?\ 1 : 0.5)$ is a step function — constant everywhere *except* at the single point $x = p$, where it jumps. Any random sample $X$ almost surely lands away from that jump, where the derivative with respect to $p$ is exactly zero. The gradient information lives entirely at the moving boundary $x = p$, which has probability zero of being hit. So our estimator confidently returns zero — every single time — while the true answer is $1/2$.

This is precisely the visibility problem in rendering: when a surface edge moves, the boundary between lit and shadowed regions shifts, but standard path tracing samples almost never land exactly on an edge. The gradient signal is invisible to naïve AD.

## Mathematical Preliminaries

### The Leibniz Integral Rule (1D)

The Leibniz rule provides the formula for differentiating an integral whose limits, as well as its integrand, depend on a parameter $p$. For a 1D integral of the form $I(p) = \int_{a(p)}^{b(p)} f(x, p) dx$, the derivative is:

$$\frac{d}{dp} \int_{a(p)}^{b(p)} f(x, p) dx = \underbrace{{\color{#00d1b2}\int_{a(p)}^{b(p)} \frac{\partial f}{\partial p}(x, p) dx}}_{\text{Interior Term}} + \underbrace{{\color{#4facfe}f(b(p), p) \frac{db}{dp}} - {\color{#ff6b6b}f(a(p), p) \frac{da}{dp}}}_{\text{Boundary Term}}$$

{{< figure src="/images/diff-rendering/svgtex/leibniz-visual.svg" id="fig-leibniz-visual" caption="Visual decomposition of the Leibniz Integral Rule into interior and boundary components." width="100%" >}}

> <details>
> <summary style="cursor: pointer;">Proof</summary>
>
> We can derive the general Leibniz rule in two steps: first by assuming constant boundaries, and then generalizing to variable boundaries using the multivariable chain rule.
>
> #### Part 1: Constant Boundaries
> Consider an integral where the limits $a$ and $b$ are constant. We want to find the derivative:
> $$\frac{d}{dt} \int_a^b f(t, x) dx$$
>
> {{< figure src="/images/diff-rendering/svgtex/leibniz-constant.svg" id="fig-leibniz-constant" caption="Visualization of the integral changing with variable $t$ with constant integration limits $a$ and $b$." width="100%" >}}
> 
> **Step 1: Expand using the Taylor series**
> We approximate $f(t+\Delta t, x)$ as $f(t, x) + {\color{#00d1b2}\frac{\partial f}{\partial t}\Delta t}$:
> $$\frac{\int_a^b \left( f(t, x) + {\color{#00d1b2}\frac{\partial f}{\partial t}\Delta t} \right) dx - \int_a^b f(t, x) dx}{\Delta t}$$
> {{< figure src="/images/diff-rendering/svgtex/leibniz-constant-components.svg" id="fig-leibniz-constant-components" caption="The difference in the area by evaluating $f(t+\Delta t, x) - f(t, x)$ across the integration interval with change $\Delta t$." width="100%" >}}
> **Step 2: Cancel the original function terms**
> The "old" area $\int f dx$ cancels out with the negative term:
> $$\frac{\cancel{\int_a^b f(t, x) dx} + \int_a^b {\color{#00d1b2}\frac{\partial f}{\partial t}\Delta t} dx - \cancel{\int_a^b f(t, x) dx}}{\Delta t}$$
>
> **Step 3: Cancel the time step $\Delta t$**
> The $\Delta t$ in the numerator and denominator eliminate each other:
> $$\frac{\int_a^b {\color{#00d1b2}\frac{\partial f}{\partial t}\cancel{\Delta t}} dx}{\cancel{\Delta t}} \implies \int_a^b {\color{#00d1b2}\frac{\partial f}{\partial t}} dx$$
>
> **Result (Part 1):**
> For constant boundaries, the derivative of the integral is simply the integral of the derivative:
> $$\frac{d}{dt} \int_a^b f(t, x) dx = \int_a^b {\color{#00d1b2}\frac{\partial f}{\partial t}} dx$$
>
> #### Part 2: Variable Limits
> Now consider the general case where boundaries depend on time: $I(t) = \int_{a(t)}^{b(t)} f(t, x) dx$.
> {{< figure src="/images/diff-rendering/svgtex/leibniz-dependent.svg" id="fig-leibniz-dependent-proof" caption="Visualization of the area under curve changed with change in the variable $\Delta t$ with limits $a(t)$ and $b(t)$" width="100%" >}}
>
> **Step 1: Decompose the integration domain**
> We split the "new" integral $\int_{a+da}^{b+db}$ into the interior $[a,b]$ and the boundary changes:
> $$\frac{{\color{#00d1b2}\int_a^b (f + \frac{\partial f}{\partial t}\Delta t) dx} - {\color{#ff6b6b}\int_a^{a + a'\Delta t} (f + \frac{\partial f}{\partial t}\Delta t) dx} + {\color{#4facfe}\int_b^{b + b'\Delta t} (f + \frac{\partial f}{\partial t}\Delta t) dx} - \int_a^b f dx}{\Delta t}$$
> {{< figure src="/images/diff-rendering/svgtex/leibniz-dependent-components.svg" id="fig-leibniz-dependent-components" caption="The difference in area under curve changed with change in the variable $\Delta t$ with limits $a(t)$ and $b(t)$." width="100%" >}}
>
> **Step 2: Discard higher-order terms ($O(\Delta t^2)$)**
> Terms like $\int \frac{\partial f}{\partial t} \Delta t dx$ in the boundary segments (which have width $\approx \Delta t$) become $\Delta t^2$ and vanish:
> $$\frac{\int_a^b f dx + {\color{#00d1b2}\int_a^b \frac{\partial f}{\partial t}\Delta t dx} - {\color{#ff6b6b}\int_a^{a + a'\Delta t} f dx} + {\color{#4facfe}\int_b^{b + b'\Delta t} f dx} - \int_a^b f dx}{\Delta t}$$
>
> **Step 3: Cancel original function and evaluate boundaries**
> Using the Fundamental Theorem of Calculus (or Mean Value Theorem), the boundary integrals become $f(t, a) a'\Delta t$ and $f(t, b) b'\Delta t$:
> $$\frac{\cancel{\int_a^b f dx} + {\color{#00d1b2}\int_a^b \frac{\partial f}{\partial t}\Delta t dx} - {\color{#ff6b6b}f(t, a)a'\Delta t} + {\color{#4facfe}f(t, b)b'\Delta t} - \cancel{\int_a^b f dx}}{\Delta t}$$
>
> **Step 4: Final Cancellation of $\Delta t$**
> $$\frac{{\color{#00d1b2}\int_a^b \frac{\partial f}{\partial t}\cancel{\Delta t} dx} - {\color{#ff6b6b}f(t, a)a'\cancel{\Delta t}} + {\color{#4facfe}f(t, b)b'\cancel{\Delta t}}}{\cancel{\Delta t}}$$
>
> **Result (Part 2):**
> For variable boundaries, the derivative of the integral includes the boundary movement terms:
> $$\frac{dI}{dt} = {\color{#00d1b2}\int_a^b \frac{\partial f}{\partial t} dx} + {\color{#4facfe}f(t, b) \frac{db}{dt}} - {\color{#ff6b6b}f(t, a) \frac{da}{dt}}$$
>
> **Final Result:**
> Combining both parts, we arrive at the general Leibniz Integral Rule (1D):
> $$\boxed{\frac{d}{dp} \int_{a(p)}^{b(p)} f(x, p) dx = \underbrace{{\color{#00d1b2}\int_{a(p)}^{b(p)} \frac{\partial f}{\partial p}(x, p) dx}}_{\text{Interior Term}} + \underbrace{{\color{#4facfe}f(b(p), p) \frac{db}{dp}} - {\color{#ff6b6b}f(a(p), p) \frac{da}{dp}}}_{\text{Boundary Term}}}$$
>
> </details>

### Generalization: Reynolds Transport Theorem (3D)

In computer graphics, we deal with 2D images and 3D scenes. The 1D Leibniz rule generalizes to
higher dimensions via the **Reynolds Transport Theorem**. For an integral over a moving domain
$X(p)$ with a potentially discontinuous integrand, the derivative is:

$$
\begin{equation}
\partial_p \int_{X(p)} f(\mathbf{x}, p)\, d\mathbf{x} = \underbrace{{\color{#0f85a5}\int_{X(p)} \partial_p f(\mathbf{x}, p)\, d\mathbf{x}}}_{\text{Interior derivative}} + \underbrace{{\color{#e69138}\oint_{\Gamma(p)} \Delta f(\mathbf{x}, p)\, \langle \partial_p \mathbf{x},\, \mathbf{n} \rangle\, d\mathbf{x}}}_{\text{Boundary derivative}} \label{reynolds-transport-theorem}
\end{equation}
$$

Where:
*   $X(p)$ is the **integration domain**, which moves as $p$ changes.
*   $\Gamma(p)$ is the **full boundary** — the union of the external boundary $\partial X(p)$ and
    any internal surfaces where $f$ is discontinuous (e.g. silhouette edges of objects).
*   $\mathbf{n}$ is the outward-facing unit **normal** at each point on $\Gamma$.
*   $\partial_p \mathbf{x}$ is the **velocity** of the boundary — how fast each boundary point moves
    as $p$ changes.
*   $\Delta f(\mathbf{x}, p) = f^-(\mathbf{x}) - f^+(\mathbf{x})$ is the **jump** in $f$ across
    $\Gamma$, where $f^-$ and $f^+$ are the one-sided limits approaching from each side along
    $\mathbf{n}$.

Note that for points on $\Gamma$ where $f$ is actually continuous, $\Delta f = 0$ and they
contribute nothing to the boundary integral — so it is safe to include more boundary points than
strictly necessary. This matters in practice: when rendering, we do not always know in advance
which edges are true silhouettes, so we can include all triangle edges and let the $\Delta f$
term naturally zero out the non-contributing ones.

This is the key formula for differentiable rendering. It tells us that to get the correct gradient,
we must supplement our standard interior integration (ordinary path tracing, differentiated) with a
**boundary sampling** pass that explicitly integrates over the silhouette edges of objects — the
locations where the rendered color jumps as geometry moves.

Continuing [Example 2](#example-2-discontinuities-the-visibility-problem), let's see how this
resolves the failure of naïve AD. The function is:

$$
I(p) = \int_0^1 f(x, p)\, dx, \quad \text{where } f(x, p) = \begin{cases} 1 & \text{if } x < p \\ 0.5 & \text{if } x > p \end{cases}
$$

{{< figure src="/images/diff-rendering/svgtex/step-function-example.svg" id="fig-step-function-example" caption="Visualization of the step function $f(x, p)$ with a discontinuity at $x = p$." width="100%" >}}

The discontinuity is at $x = p$, so $\Gamma = \{p\}$, $\langle \partial_p x, \mathbf{n} \rangle = 1$,
and the jump is $\Delta f = f^-(p) - f^+(p) = 1 - 0.5 = 0.5$. Applying the 1D Leibniz rule:

$$
\begin{aligned}
\frac{dI}{dp} &= \underbrace{\int_0^1 \partial_p f\, dx}_{\text{Interior}} + \underbrace{\Delta f(\mathbf{x}, p)\, \langle \partial_p x,\, \mathbf{n} \rangle}_{\text{Boundary}} \\
&= \int_0^1 0\, dx + [f^-(p) - f^+(p)] \cdot 1 \\
&= 0 + [1 - 0.5] \cdot 1 \\
&= 0.5
\end{aligned}
$$

This matches the analytic derivative of $I(p) = 0.5p + 0.5$, confirming $\frac{dI}{dp} = 0.5$.
Unlike naïve AD — which returns zero by only seeing the interior term — the Leibniz rule correctly
captures the contribution of the moving discontinuity by explicitly accounting for the jump
$\Delta f$ at the boundary.

## Motivating Example: Differentiating Visibility

In this section, we will work on a simplified problem with rendering two $2D$ triangles with constant colors. The two triangles can occlude each other. In this case our scene parameters are the 6 triangle vertices ($12$ numbers) and the colors of 2 triangles ($6$ real numbers).. Given these 18 total numbers as a vector $\mathbf{\pi}$, where we denote the vertices parameters as $\mathbf{\pi}_v$ and color parameters as $\mathbf{\pi}_c$, we want to generate an image $I(\pi)$ and compute a loss function $\mathcal{L}(I(\pi))$ (e.g., comparing the image with a target, or feeding the image to a neural network classifier). Our goal is to compute the gradient $\nabla_{\pi} \mathcal{L}(I(\pi))$ so that we can minimize the loss using gradient-based optimization.

{{< figure src="/images/diff-rendering/triangles/fig_a_vector.svg" id="fig-triangle-a" caption="The image of the triangles with constant colors (or at least how the imaging function $m(x, y; \mathbf{\pi})$ looks)" width="100%" >}}

Before we talk about gradients, we need to discuss how the image $I$ is defined. How do we generate an image from two triangles? We can imagine that the two triangles define an underlying *imaging function* $m(x, y; \mathbf{\pi})$ that maps continuous $2D$ coordinates $(x, y)$ to a RGB color, depending on which triangle coordinate hits. However, an image is a discrete 2D grid. How do we go from the imaging function $m$ to the image $I$? A naive approach is to evaluate the $m$ at the center of the pixel. This approach is prone to *aliasing* which causes issues including jagged edges, temporal flickering, Moire patterns, etc and breaking up fine details.

{{< figure src="/images/diff-rendering/triangles/fig_b_aliased.svg" id="fig-triangle-b" caption="The image formed when imaging function $m(x, y; \mathbf{\pi})$ is evaluated only at the center. We can see the aliasing artifact (jagged edges)" width="100%" >}}

From the signal processing perspective, we are *sampling* this 2D domain with a discrete image, where the sampling rate is determined by the imaging function. Since the image function $m$ is discontinuous, it has energy at all frequencies and is not bandlimited. Therefore, as long as we are evaluating at the center of the pixels, we will suffer from the aliasing problem no matter how large we select the resolution. To resolve the aliasing issue, we need to remove the high-frequency energy from the imaging function $m$. This is done by convolving the imaging function with a low-pass filter. For each pixel $I_i$, we evaluate an integral centered around the pixel center $(x_i, y_i)$:

$$
I_i = \int \int k(x, y)m(x_i, + x, y_i + y; \mathbf{\pi}) dx dy = \int \int f(x, y; \mathbf{\pi}) dx dy,
$$
where $k(x, y)$ is the *kernel* (or *filter*) and $f(x, y; \mathbf{\pi}) = k(x, y)m(x_i, + x, y_i + y; \mathbf{\pi})$ is the rendering integrand.


Intuitively, to remove the artifacts introduced by aliasing, instead of only sampling the center at each pixel, we evaluate the weighted average color over an area.

{{< figure src="/images/diff-rendering/triangles/fig_c_antialiased.svg" id="fig-triangle-c" caption="The image formed when imaging function $m(x, y; \mathbf{\pi})$ is evaluated only at the center. We can see the aliasing artifact (jagged edges)" width="100%" >}}

The selection of $k$ is not something we will discuss but PBRT book has a section on this. 

Most renderers, whether real-time, offline, physics-based, differentiable or not, need to deal with the aliasing issue. Most of them solve the anti-aliasing integral using numerical solution by evaluating the imaging function at various locations, a process often called *discretization*:
$$
\begin{equation}
I_i \approx \frac{1}{N}\sum_{j=1}^N f(x_j, y_j; \mathbf{\pi}) \label{eq:discretization}
\end{equation}
$$
where $(x_j, y_j)$ are various sampling locations within the $i$-th pixel. The naive approach of evaluating at pixel center can also be seen as a (poor) approximation to the integral by setting $N = 1$ and $x_0 = y_0 = 0.5$.

We say a discretization is **consistent** if the discretization converges to the integral, i.e., $lim_{N\rightarrow \infty} \frac{1}{N} \sum_{j=1}^N f(x_j, y_j; \mathbf{\pi}) = I_i$. The choice of the sample $x_j, y_j$ does not need to be stochastic. Nevertheless, if we are randomly sampling $x_j, y_j$ using the probabilistic distribution, we say a discretization is **unbiased** if the expectation is the same as the integral, i.e., $\mathbb{E}[f(x_j, y_j)] = I_i$.

In fact the integrals do not just come under the case of aliasing but we can model motion blur as an integration over time during the camera shutter is open, defocus blur for non-pinhole cameras as an integration over the aperture area. Given an area light, we compute the radiance that goes from the light source to the camera by integrating over the area of the light source. Kajiya showed that we can model global illumination as an recursive integral, by integrating each 3D point in the scene recursively.

Remember that our goal is to compute the gradient of the image $I$ that contains the two triangles, over some scalar loss function $L$, that is, $\nabla_{\pi} \mathcal{L}(\mathbf{I}(\mathbf{\pi}))$. Using the chain rule, we know that for each component $\pi \in \mathbb{R}$ in the parameter vector $\mathbf{\pi}$:

$$
\frac{\partial}{\partial \mathbf{\pi}} \mathcal{L}(\mathbf{I}(\mathbf{\pi})) = \sum_i \frac{\partial \mathcal{L}}{\partial I_i} \cdot \frac{\partial I_i}{\partial \mathbf{\pi}} 
$$

where $\frac{\partial \mathcal{L}}{\partial I_i}$ is the partial derivative of the loss function with respect to the $i$-th pixel, and $\frac{\partial I_i}{\partial \mathbf{\pi}}$ is the partial derivative of the $i$-th pixel with respect to the parameters. To be more concrete, if our loss function is the sum of pixel-wise squared difference with another target image $\hat{I}$, that is,
$$
\mathcal{L} = \left( \hat{I}(\mathbf{\pi}) - I(\mathbf{\pi}) \right)^2.
$$

then the gradient is 

$$
\nabla_{\pi} \mathcal{L} = \sum_i 2 \left( I(\mathbf{\pi}) - \hat{I}(\mathbf{\pi}) \right) \nabla_{\pi} I_i(\mathbf{\pi})
$$

where $\nabla_{\pi} I_i(\mathbf{\pi})$ is the partial derivative of the $i$-th pixel with respect to the parameters. Now we want to compute the derivative of a pixel color with respect to the scene parameters $\mathbf{\pi}$. 

{{< figure src="/images/diff-rendering/svgtex/triangles/2.svg" id="fig-triangle-c" caption="Triangles with the dotted circle for the pixel support. We want to compute the derivative of the pixel color with respect to the triangle vertex positions." width="100%" >}}

A common misconception of the non-differentiability of rendering is that the derivative $\partial I_i (\mathbf{\pi}) / \partial \pi$ is discontinuous and not differentiable. However, recall that $I_i$ is an integral that evaluates the average color within the filter support. Therefore, the movement of the triangle vertices will in fact lead to continuous and differentiable changes to the average color. **The integrand of rendering is discontinuous and not differentiable, but the integral is actually differentiable!** Importantly, we did not make rendering an integration problem to make it differentiable. Instead, rendering is an integration problem in the first place. All the approaches in any rendering methods, real-time or offline, are different approximations or discretizations of the rendering integral.

How do we compute the derivatives of an integral? Recall that we wanted to compute the integral numerically (Equation $\eqref{eq:discretization}$). Unfortunately, we cannot just automatically differentiate the numerical integrator as we saw in the [Example 2](#example-2-discontinuities-the-visibility-problem). For the vertex position parameters, the numerical integrator will always evaluate to 0. 

{{< figure src="/images/diff-rendering/svgtex/triangles/5.svg" id="fig-triangle-c" caption="Sampling at yellow points will give 0 derivative as there is no local change around that point. But we can see that changing the position of blue triangle will change the average color of pixel and that change is continuous." width="100%" >}}

However, the derivative of the integral with respect to a vertex position parameter $\mathbf{\pi}_v$ is not 0.

$$
\frac{\partial}{\partial \pi} I_i(\mathbf{\pi}) = \frac{\partial}{\partial \pi} \iint f(x, y; \mathbf{\pi}) dx dy \neq \frac{1}{N}\sum_{j=1}^{N}\frac{\partial f(x_j, y_j; \mathbf{\pi})}{\partial \pi} = 0
$$

In general, the discretization and the gradient operator do not commute for discontinuous integrands. This is because the derivatives are measuring local changes, and the uniform discretization has zero chance of detecting the local changes around discontinuities (the sample will need to be on the edge which has probability 0). We can take a look at the [Example 2](#example-2-discontinuities-the-visibility-problem) to see that we need to explicitly sample at the boundary to detect the change. 

{{< figure src="/images/diff-rendering/svgtex/triangles/6.svg" id="fig-triangle-c" caption="Purple points represent sampling explicitly at the edges. This will capture the change in the pixel and thus will give us correct gradient" width="100%" >}}

In general, we will need to evaluate Reynold's Transport Theorem (Equation $\eqref{reynolds-transport-theorem}$) for this problem:

{{< figure src="/images/diff-rendering/svgtex/triangles/8.svg" id="fig-reynolds-theorem" caption="The Reynolds Transport Theorem decomposed into interior and boundary derivatives." width="100%" >}}


To intuitively understand the boundary derivative, we can visualize it as calculating the volume of an **infinitesimal boundary wedge** created by the movement of an edge.

For every point on a silhouette edge, as the parameter $p$ changes, the edge sweeps out a small parallelogram. The boundary integral accumulates these infinitesimal volumes along the entire discontinuity contour. 

We can decompose the integrand into three intuitive geometric components:
1. **Height ($f_- - f_+$):** The difference in pixel color (or radiance) between the two sides of the edge (e.g., transitioning from the occluded blue background to the moving red foreground).
2. **Width ($n \cdot v$):** The distance the edge moves, projected along the normal direction $n$. Movement parallel to the edge simply slides along the boundary and doesn't change the area; only perpendicular movement contributes to the derivative!
3. **Length ($dt$ or $d\pi$):** The differential line segment along the boundary contour itself.

Thus the boundary integral becomes:

$$
\int_{\partial \Omega} (f(p^-) - f(p^+)) \, (\mathbf{n} \cdot \mathbf{v}) \, dt
$$

which can also be approximated with Monte Carlo sampling.

{{< figure src="/images/diff-rendering/svgtex/triangles/9.svg" id="fig-boundary-volume" caption="The Infinitesimal Boundary Volume. For each point on the boundary, we compute its 2D movement $v$ with respect to the differentiating parameter. This movement is projected onto the normal direction $n$ to yield the normal movement speed $n \cdot v$. This projection accounts for the infinitesimal width of the swept area, allowing us to properly measure the infinitesimal area changes at the boundary. Multiplying this projected width by the differential edge segment $dt$ (length) and the color jump (height) calculates the exact boundary derivative contribution." width="100%" >}}


### Code for the above example
The following code is adapted from SIGGRAPH 2020 Course.

```python
import numpy as np

class TriangleMesh:
    def __init__(self, vertices, indices, colors):
        self.vertices = np.array(vertices, dtype=np.float64)  # (N, 2) vertices
        self.indices = np.array(indices, dtype=np.int32)      # (M, 3) face indices
        self.colors = np.array(colors, dtype=np.float64)      # (M, 3) per-face RGB

def raytrace(mesh, pos):
    """
    Uses the half-plane test: a point is inside a triangle if it's
    on the same side of all three edges.
    """
    for i in range(len(mesh.indices)):

        # Extract the current triangle
        idx = mesh.indices[i]
        v0, v1, v2 = mesh.vertices[idx[0]], mesh.vertices[idx[1]], mesh.vertices[idx[2]]

        # Edge normals (2D perpendicular: normal of (dx,dy) = (-dy, dx))
        def normal_2d(v):
            return np.array([-v[1], v[0]])

        # Get edge normals for all edges of triangles
        n01 = normal_2d(v1 - v0)
        n12 = normal_2d(v2 - v1)
        n20 = normal_2d(v0 - v2)

        # Find in which side pos is for each edge 
        side01 = np.dot(pos - v0, n01) > 0
        side12 = np.dot(pos - v1, n12) > 0
        side20 = np.dot(pos - v2, n20) > 0

        # if it is on same side for all edges, then it is inside (since this is 2D)
        if (side01 and side12 and side20) or (not side01 and not side12 and not side20):
            return mesh.colors[i], i

    return np.array([0.0, 0.0, 0.0]), -1  # background

def render(mesh, h, w, spp=4):
    """
    Forward pass: render the mesh into an image.
    """
    img = np.zeros((h, w, 3))    # setup the (H, W, 3) buffer for RGB image
    sqrt_spp = int(np.sqrt(spp)) # grid cells for stratified sampling
    
    # For each pixel
    for y in range(h):
        for x in range(w):
            # for each grid cell
            for dy in range(sqrt_spp):
                for dx in range(sqrt_spp):

                    # Offset the position within the pixel
                    xoff = (dx + np.random.rand()) / sqrt_spp
                    yoff = (dy + np.random.rand()) / sqrt_spp
                    
                    # compute the color at that position
                    pos = np.array([x + xoff, y + yoff])
                    color, _ = raytrace(mesh, pos)
                    img[y, x] += color / spp
    return img

def compute_interior_derivatives(mesh, adjoint, spp=4):
    """
    Interior derivatives: ∂Loss/∂color.
    Standard AD works here because color changes are continuous.
    """
    img_h, img_w = adjoint.shape[:2]
    sqrt_spp = int(np.sqrt(spp))
    d_colors = np.zeros_like(mesh.colors)

    # For each pixel
    for y in range(img_h):
        for x in range(img_w):
            # For each grid cell
            for dy in range(sqrt_spp):
                for dx in range(sqrt_spp):

                    # Find the position within the cell within pixel
                    xoff = (dx + np.random.rand()) / sqrt_spp
                    yoff = (dy + np.random.rand()) / sqrt_spp

                    # compute the gradient at that position
                    pos = np.array([x + xoff, y + yoff])
                    _, hit_idx = raytrace(mesh, pos)
                    if hit_idx >= 0:
                        d_colors[hit_idx] += adjoint[y, x] / spp
    return d_colors


def collect_edges(mesh):
    """Collect unique edges."""
    edges = set() # Stores edges as tuples (u, v)

    for idx in mesh.indices:
        edges.add((min(idx[0], idx[1]), max(idx[0], idx[1])))
        edges.add((min(idx[1], idx[2]), max(idx[1], idx[2])))
        edges.add((min(idx[2], idx[0]), max(idx[2], idx[0])))

    # [(u, v) ...]
    return list(edges)

def build_edge_sampler(mesh, edges):
    """Build CDF for importance-sampling edges by length."""
    lengths = []
    
    # Store the lengths of the edges
    for v0_id, v1_id in edges:
        lengths.append(np.linalg.norm(mesh.vertices[v1_id] - mesh.vertices[v0_id]))

    lengths = np.array(lengths)

    # Use the edge lengths as weight for PDF and construct CDF
    pmf = lengths / lengths.sum()
    cdf = np.concatenate([[0], np.cumsum(pmf)])
    
    return pmf, cdf, lengths

def compute_edge_derivatives(mesh, adjoint, n_edge_samples=10000):
    """∂Loss/∂vertices via Reynolds Transport Theorem."""

    # Extract unique edges and build CDF for sampling
    img_h, img_w = adjoint.shape[:2]
    edges = collect_edges(mesh)
    pmf, cdf, lengths = build_edge_sampler(mesh, edges)

    d_vertices = np.zeros_like(mesh.vertices)
    screen_dx = np.zeros((img_h, img_w, 3))
    screen_dy = np.zeros((img_h, img_w, 3))

    for i in range(n_edge_samples):
        # 1. Pick an edge (importance sampling by length)
        u = np.random.rand()
        edge_id = np.searchsorted(cdf, u, side='right') - 1
        edge_id = np.clip(edge_id, 0, len(edges) - 1)
        u, v = edges[edge_id]

        # 2. Pick a point on the edge
        v0 = mesh.vertices[u]
        v1 = mesh.vertices[v]
        t = np.random.rand()   # t in [0, 1]
        p = v0 + t * (v1 - v0)

        xi, yi = int(p[0]), int(p[1])
        if xi < 0 or yi < 0 or xi >= img_w or yi >= img_h:
            continue

        # 3. Sample both sides of the edge (the "jump" / discontinuity)
        edge_dir = (v1 - v0) / np.linalg.norm(v1 - v0)
        n = np.array([-edge_dir[1], edge_dir[0]])  # outward normal
        eps = 1e-3

        color_in, _ = raytrace(mesh, p - eps * n)
        color_out, _ = raytrace(mesh, p + eps * n)

        # 4. Compute gradient contribution (Reynolds Transport Theorem)
        pdf = pmf[edge_id] / lengths[edge_id]
        weight = 1.0 / (pdf * n_edge_samples)
        color_diff = color_in - color_out  # the jump Δf
        adj = np.dot(color_diff, adjoint[yi, xi])

        # dp/dv0 = (1-t), dp/dv1 = t  (from p = v0 + t*(v1-v0))
        d_v0 = np.array([(1 - t) * n[0], (1 - t) * n[1]]) * adj * weight
        d_v1 = np.array([t * n[0], t * n[1]]) * adj * weight

        d_vertices[u] += d_v0
        d_vertices[v] += d_v1

        # Screen-space derivatives
        screen_dx[yi, xi] += -n[0] * color_diff * weight
        screen_dy[yi, xi] += -n[1] * color_diff * weight

    return d_vertices, screen_dx, screen_dy


# 1. Scene setup
c_blue =[15/255, 133/255, 165/255]
c_red  =[187/255, 37/255, 66/255]

scale = 2.0
mesh = TriangleMesh(
    vertices = np.array([
        # Tri 0 (Red)
        [10.0, 12.0],[26.0, 1.0], [31.0, 16.0], 
        # Tri 1 (Blue)
        [2.0, 11.0],[16.0, 2.0], [20.0, 19.0],  
    ]) * scale,
    indices = [[0, 1, 2], [3, 4, 5]],
    colors =[c_red, c_blue] 
)

# Window setup
W, H, spp = 70, 45, 4 
np.random.seed(48)

# 2. Forward Pass
print("Rendering...")
img = render(mesh, H, W, spp)

# 3. Backward Pass (Interior: ∂I/∂color)
adjoint = np.ones((H, W, 3)) # Uniform adjoint to pull gradients
d_colors = compute_interior_derivatives(mesh, adjoint, spp)

# 4. Backward Pass (Edges: ∂I/∂vertex via boundary sampling)
d_verts, screen_dx, screen_dy = compute_edge_derivatives(mesh, adjoint, n_edge_samples=W*H)

print("\nVertex Gradients (d_verts):")
print(np.round(d_verts, 4))

# Output:
# Vertex Gradients (d_verts):
# [[ -4.2248   2.533 ]
#  [  7.4785 -18.8305]
#  [ 13.7454  13.4763]
#  [-21.0542   4.3572]
#  [  0.4232 -20.9386]
#  [  2.0691  19.6481]]
```

<div class="paper-fig-row">
    {{< figure src="/images/diff-rendering/triangles/1_forward_render.png" caption="Forward Render Output" id="fig-triangle-forward" width="100%">}}
    {{< figure src="/images/diff-rendering/triangles/2_positive_gradient.png" caption="Positive Gradients" id="fig-triangle-pos" width="100%" >}}
    {{< figure src="/images/diff-rendering/triangles/3_negative_gradient.png" caption="Negative Gradients" id="fig-triangle-neg" width="100%" >}}
</div>

# Physics-Based Differentiable Rendering Theory

The previous sections demonstrated how to differentiate the rendering integral with respect to geometry parameters using the Reynolds Transport Theorem. However, fully leveraging the power of physics-based differentiable rendering requires us to differentiate with respect to **material parameters** (e.g., albedo, roughness) and **illumination parameters** (e.g., position, intensity of light sources).