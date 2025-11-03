---
author: ["Utkarsh Sharma"]
title: "Linear Regression with MLE and MAP"
date: "2025-10-30"
description: "Linear Regression using MLE and MAP"
summary: "Linear Regression using MLE and MAP with visualization and implementation"
tags: ["Linear Regression","MLE"]
categories: ["machine-learning", "statistics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

## Linear Regression

In *regression*, we aim to find a function $f$ that maps input $x\in \mathbb{R}^{D}$ to corresponding  function values $f(x)\in \mathbb{R}$. We assume we are given a set of training input data $\mathcal{D}=\lbrace x_1, ..., x_n\rbrace$ and corresponding noisy observations $y_n =f(x_n) + \epsilon$, where $\epsilon$ is an i.i.d. random variable that describes measurement/observation noise and potentially unmodeled process.

We assume zero-mean Gaussian noise and our task is to find a function that not only models the training data, but generalizes well to predicting function values at input locations that are not part of the training data.

### Problem Formulation


Here, $x\in \mathbb{R}^D$ are inputs and $y\in \mathbb{R}$ are noisy function values (targets). The functional relationship between $x$ and $y$ is given as 
$$y = f(x) + \epsilon$$

where $\epsilon\sim \mathcal{N}(0, \sigma^2)$ is i.i.d. Gaussian measurement noise.  

Because of the presence of observation noise, we will adopt a probabilistic approach and explicitly model the noise using a likelihood function. More specifically, we consider a regression problem with likelihood function:
$$p(y|x) = \mathcal{N}(y \mid f(x), \sigma^2)$$

In **Linear Regression**, we consider the special case that the model parameters $\theta$ appear linearly in our model (Note that it is "linear in the parameters").

$$p(y \mid x) = \mathcal{N}\big(y \mid f(x), \sigma^2\big)$$
$$\Longleftrightarrow \quad y = x^\top \theta + \varepsilon, \quad \varepsilon \sim \mathcal{N}(0, \sigma^2)$$

where $\theta\in\mathbb{R}^D$ are the parameters we seek. The class of function described by this function are straight lines that pass through the origin. We can add a bias $b$ to the above equation to define an affine transformation instead of linear one to fix the issue or simply augment $x^0 = 1$ to features and $\theta_0=0$ in parameters to simulate that using above.

### Parameters Estimation

Assuming we are given a *training set* $\mathcal{D} = \lbrace (x_1, y_1), ..., (x_N, y_N) \rbrace$ consisting of $N$ inputs $x_n \in \mathbb{R}^D$ and corresponding observations/targets $y_n\in \mathbb{R}, n=1, ...,N$. Note that $y_i$ and $y_j$ are conditionally independent given their respective inputs so the likelihood can we written as:

$$p(\mathcal{Y}\mid\mathcal{X}, \theta) = p(y_1,\dots, y_n|x_1, \dots, x_n)$$

$$p(\mathcal{Y}\mid\mathcal{X}, \theta) = \prod_{n=1}^{N}p(y_n|x_n, \theta) = \prod_{n=1}^{N}\mathcal{N}(y_n\mid x_n^\top \theta, \sigma^2)$$

where we defined $\mathcal{X} = \lbrace x_1, \dots, x_N \rbrace$ and $\mathcal{Y} = \lbrace y_1, \dots, y_N \rbrace$ respectively. We can then use the parameter estimation to get an optimal estimate for parameters, $\theta^*$, for the linear regression model.

### Estimating with MLE

To find the desired parameterss $\theta_{MLE}$ we can use maximum likelihood estimate. Intuitively, this means maximizing the predictive distribution of training data given the model parameters. We obtain the maximum likelihood parameters as:

$$\theta_{ML} = \arg\max_\theta p(\mathcal{Y}\mid\mathcal{X}, \theta)$$

It is easier to deal with the Negative Log Likelihood so we get the following optimization problem.

$$\theta_{ML} = \arg\min_\theta -\log p(\mathcal{Y}\mid\mathcal{X}, \theta)$$

We can use gradient descent to optimize but for this we have a closed form solution.

$$
\begin{aligned}
\theta_{\mathrm{ML}}
&= \arg\max_{\theta} p(\mathcal{Y}\mid\mathcal{X},\theta) \\[6pt]
&= \arg\max_{\theta} \prod_{i=1}^N p(y_i\mid x_i,\theta) \qquad \text{(independent examples)} \\[6pt]
&= \arg\max_{\theta} \sum_{i=1}^N \log p(y_i\mid x_i,\theta) \qquad \text{(log is monotonic)} \\[6pt]
&= \arg\max_{\theta} \sum_{i=1}^N \log \mathcal{N}(y_i \mid x_i^\top\theta, \sigma^2) \\[6pt]
&= \arg\max_{\theta} \sum_{i=1}^N \left[ \log\left(\frac{1}{\sqrt{2\pi\sigma^2}}\right) + \log\left(e^{-\frac{(x_i^\top\theta - y_i)^2}{2\sigma^2}}\right) \right] \\[6pt]
&= \arg\max_{\theta} \sum_{i=1}^N \left[ -\frac{(x_i^\top\theta - y_i)^2}{2\sigma^2} \right] \qquad \text{(constant term dropped)} \\[6pt]
&= \arg\min_{\theta} \frac{1}{2\sigma^2}\sum_{i=1}^N (x_i^\top\theta - y_i)^2
\end{aligned}
$$




We can obtain a loss function as
$$
\mathcal{L}(\theta) = \tfrac{1}{2\sigma^2}\sum_{i=1}^{N}(x_i^\top\theta - y_i)^2
= \tfrac{1}{2\sigma^2}(y - X\theta)^\top(y - X\theta)
= \tfrac{1}{2\sigma^2}\|y - X\theta\|^2
$$

$$
\boxed{\mathcal{L}(\theta) = \tfrac{1}{2\sigma^2}\|y - X\theta\|^2
}$$

where we defined *design matrix* $X = [x_1, \dots, x_N]^\top \in \mathbb{R}^{N\times D}$ as the collection of training inputs and $y = [y_1, \dots, y_n]^\top  \in \mathbb{R}^{N}$ as a collection of targets.

We now have a concrete form of Negative Log Likelihood function we need to optimize. Since the function is quadratic, we can find unique global solution by computing the gradient of $\mathcal{L}$, setting it to $0$ and solving for $\theta$.

$$
\begin{aligned}
\frac{\partial \mathcal{L}}{\partial\theta} 
&= \frac{d}{d\theta}\!\left(\tfrac{1}{2\sigma^2}(y - X\theta)^\top(y - X\theta)\right) \\[6pt]
&= \tfrac{1}{2\sigma^2}\frac{d}{d\theta}\!\left(y^\top y - 2y^\top X\theta + \theta^\top X^\top X\theta\right) \\[6pt]
&= \tfrac{1}{2\sigma^2}\big(-2X^\top y + 2X^\top X\theta\big) \\[6pt]
&= -X^\top y + X^\top X\theta = 0\\
&\Rightarrow X^\top X\theta = X^\top y \end{aligned}$$

Thus we get the closed form solution as :
$$\therefore \quad \boxed{\theta_{\text{MLE}} = (X^\top X)^{-1}X^\top y} $$


### Estimating with MAP

We now assume a prior for the model parameters $\theta$. The choice of the prior will affect which regularization term is added to the loss function.  
For now, we will assume the following prior formulation:

$$
\begin{aligned}
\theta_{\text{MAP}}
&= \arg\max_\theta \; P(\theta \mid y_1,x_1,\dots,y_N,x_N) \\[4pt]
&= \arg\max_\theta \; P(y_1,x_1,\dots,y_N,x_N \mid \theta)\,P(\theta)
\qquad\text{(Bayes' rule; denominator dropped)} \\[6pt]
&= \arg\max_\theta \; \Big[\prod_{i=1}^N P(y_i,x_i \mid \theta)\Big] P(\theta) \\[6pt]
&= \arg\max_\theta \; \Big[\prod_{i=1}^N P(y_i \mid x_i, \theta)\,P(x_i \mid \theta)\Big] P(\theta) \\[6pt]
&= \arg\max_\theta \; \Big[\prod_{i=1}^N P(y_i \mid x_i, \theta)\,P(x_i)\Big] P(\theta)
\qquad\text{(assume }P(x_i\mid \theta)=P(x_i)\text{)} \\[6pt]
&= \arg\max_\theta \; \Big[\prod_{i=1}^N P(y_i \mid x_i, \theta)\Big] P(\theta) \\[6pt]
&= \arg\max_\theta \; \sum_{i=1}^N \log P(y_i \mid x_i, \theta) + \log P(\theta)
\qquad\text{(take log)}.
\end{aligned}
$$

Assume Gaussian likelihood $y_i \mid x_i,\theta \sim \mathcal{N}(x_i^\top \theta,\;\sigma^2)$ 
and Gaussian prior $\theta \sim \mathcal{N}(0,\;\tau^2 I)$. Then

$$
\begin{aligned}
\theta_{\text{MAP}}
&= \arg\max_\theta \; \sum_{i=1}^N \left[-\frac{(x_i^\top \theta - y_i)^2}{2\sigma^2}\right] 
\;+\; \left[-\frac{\theta^\top \theta}{2\tau^2}\right] \;+\; \text{const} \\[6pt]
&= \arg\min_\theta \; \frac{1}{2\sigma^2}\sum_{i=1}^N (x_i^\top \theta - y_i)^2 \;+\; \frac{1}{2\tau^2} \theta^\top \theta .
\end{aligned}
$$

Equivalently, dividing by $N$ and writing in empirical-risk form:

$$
\begin{aligned}
\theta_{\text{MAP}}
&= \arg\min_\theta \; \frac{1}{N}\sum_{i=1}^N (x_i^\top \theta - y_i)^2 \;+\; \lambda \|\theta\|_2^2
\end{aligned}
$$

where $\lambda = \frac{\sigma^2}{N\,\tau^2}$


We can also get the closed form solution for the MAP estimate as follows:
$$
\begin{aligned}
\mathcal{L}_{\text{MAP}}(\theta)
&= \frac{1}{2\sigma^2}\|y - X\theta\|^2 + \frac{1}{2\tau^2}\|\theta\|^2 \\[6pt]
&= \frac{1}{2\sigma^2}(y - X\theta)^\top(y - X\theta) + \frac{1}{2\tau^2}\theta^\top\theta \\[6pt]
&= \frac{1}{2\sigma^2}(y^\top y - 2y^\top X\theta + \theta^\top X^\top X\theta) + \frac{1}{2\tau^2}\theta^\top\theta
\end{aligned}
$$

Compute the gradient with respect to $ \theta $, we get:

$$
\begin{aligned}
\frac{\partial \mathcal{L}_{\text{MAP}}}{\partial\theta} 
&= \frac{1}{2\sigma^2}\frac{d}{d\theta}\left(y^\top y - 2y^\top X\theta + \theta^\top X^\top X\theta\right) + \frac{1}{2\tau^2}\frac{d}{d\theta}(\theta^\top\theta) \\[6pt]
&= \frac{1}{2\sigma^2}(-2X^\top y + 2X^\top X\theta) + \frac{1}{2\tau^2}(2\theta) \\[6pt]
&= \frac{1}{\sigma^2}(X^\top X\theta - X^\top y) + \frac{1}{\tau^2}\theta
\end{aligned}
$$


Set the gradient to zero:
$$
\begin{aligned}
\frac{\partial \mathcal{L}_{\text{MAP}}}{\partial\theta} &= 0 \\[6pt]
\Rightarrow\quad \frac{1}{\sigma^2}(X^\top X\theta - X^\top y) + \frac{1}{\tau^2}\theta &= 0 \\[6pt]
\Rightarrow\quad X^\top X\theta - X^\top y + \frac{\sigma^2}{\tau^2}\theta &= 0 \\[6pt]
\Rightarrow\quad (X^\top X + \tfrac{\sigma^2}{\tau^2} I)\theta = X^\top y
\end{aligned}
$$

Thus we get the closed form solution as :

$$
\therefore \quad \boxed{\theta_{\text{MAP}} = (X^\top X + \tfrac{\sigma^2}{\tau^2} I)^{-1}X^\top y}
$$

Optional (empirical-risk form):

$$
\begin{aligned}
\mathcal{L}_{\text{MAP}}(\theta)
&= \frac{1}{N}\sum_{i=1}^N (x_i^\top\theta - y_i)^2 + \lambda\|\theta\|_2^2, \\[4pt]
\text{where}\quad \lambda &= \frac{\sigma^2}{N\tau^2}.
\end{aligned}
$$

$$
\Rightarrow\quad
(\tfrac{X^\top X}{N} + \lambda I)\theta = \tfrac{X^\top y}{N}
\quad\Rightarrow\quad
\boxed{\theta_{\text{MAP}} = (X^\top X + \lambda I)^{-1}X^\top y}
$$

---

---

## Summary

- **Ordinary Least Squares (OLS)**  
  - Objective: $\displaystyle \min_w \frac{1}{n}\sum_{i=1}^n (x_i^\top w - y_i)^2$  
  - Regularization: None  
  - Closed form: $\displaystyle w = (X X^\top)^{-1} X y^\top$

- **Ridge Regression**  
  - Objective: $\displaystyle \min_w \frac{1}{n}\sum_{i=1}^n (x_i^\top w - y_i)^2 + \lambda\|w\|_2^2$  
  - Regularization: $L_2$  
  - Closed form: $\displaystyle w = (X X^\top + \lambda I)^{-1} X y^\top$

---

## References

1. Deisenroth, M. P., Faisal, A. A., & Ong, C. S. (2020). *Mathematics for Machine Learning*. Cambridge University Press.
2. Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.  
3. Cornell University CS4780/5780: *Machine Learning for Intelligent Systems* Lecture Notes.  
