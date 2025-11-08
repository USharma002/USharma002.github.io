---
author: ["Utkarsh Sharma"]
title: "Bias–Variance Tradeoff"
date: "2025-11-08"
description: "Exploring the bias–variance tradeoff in polynomial regression"
summary: "Understanding how bias and variance affect model performance"
tags: ["Bias-Variance", "Model Generalization", "Machine Learning"]
categories: ["machine-learning", "statistics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

<span style="color:red;font-weight:700;font-size:1.05em">
This post is a work in progress and may be updated or expanded soon!
</span>

# Introduction

Suppose we have a dataset  
$\mathcal{D} = \{(x_1, y_1), \dots, (x_N, y_N)\}$  
drawn i.i.d. from some distribution $p(X, Y)$ in a regression setting where $y \in \mathbb{R}$.

The expected prediction error can be decomposed as:
\[
\mathbb{E}[(y - \hat{f}(x))^2] = \text{Bias}^2(\hat{f}(x)) + \text{Var}(\hat{f}(x)) + \sigma^2
\]
where $\hat{f}(x)$ is the learned model, $\text{Bias}^2$ measures systematic error, $\text{Var}$ is the variance across datasets, and $\sigma^2$ is the irreducible noise.


### Experimentation

For the following experiments, I am calculting the best fit as follows:
$$\boxed{\theta_{\text{MAP}} = (X^\top X + \alpha I)^{-1}X^\top y}$$

I can  simulate the MLE results by putting $\alpha=0$ giving me Estimate when there is no prior information/distribution on weights/coefficients.

The (unknown) true function used for experiments is:

\[
f(x) = 0.1\,x^3 - 0.5\,x^2 + 0.3\,x + 0.2
\]

{{< 
figure src="../../images/bias-variance/true_function.png" 
num="1" 
id="true-function"
caption="True cubic function (ground truth)" 
width="70%" 
>}}

---

## Interactive Demo

*Experiment with polynomial degree and regularization below:*

<iframe src="/interactive/bias_variance.html"
        width="100%"
        height="850"
        frameborder="0"
        style="border-radius:8px; min-width: 900px;">
</iframe>

---

# Experimental Results

**Setup:**  
500 random datasets, each with 100 training points ($N=100$); noise: $\sigma=0.5$.

---

## Without Regularization ($\alpha = 0$)

| Degree | Bias²   | Variance | Condition Number |
|:------:|:-------:|:--------:|:----------------:|
| 1      | 0.2789  | 0.0124   | 1.00e+00         |
| 2      | 0.0576  | 0.0109   | 7.92e+00         |
| 3      | 0.0000  | 0.0111   | 3.95e+01         |
| 4      | 0.0000  | 0.0140   | 2.49e+02         |
| 5      | 0.0000  | 0.0172   | 1.79e+03         |
| 6      | 0.0000  | 0.0205   | 1.37e+04         |
| 7      | 0.0000  | 0.0248   | 1.13e+05         |
| 8      | 0.0001  | 0.0329   | 9.60e+05         |
| 9      | 0.0001  | 0.0443   | 8.57e+06         |
| 10     | 0.0001  | 0.0548   | 7.86e+07         |
| 11     | 0.0001  | 0.0706   | 7.49e+08         |
| 12     | 0.0005  | 0.1235   | 7.29e+09         |
| 13     | 0.0017  | 0.2015   | 7.32e+10         |
| 14     | 0.0002  | 0.6302   | 7.38e+11         |
| 15     | 0.0036  | 1.4014   | 7.77e+12         |

- **Bias quickly drops to zero** by degree 3 (the true function’s degree).
- **Variance increases modestly** for low degrees, but explodes as the condition number becomes large ($\gtrsim 10^9$).

{{< 
figure src="../../images/bias-variance/bias_variance_stacked.png" 
num="2" 
id="unregularized"
caption="Bias-Variance decomposition (no regularization)" 
width="100%" 
>}}

---

## With Regularization ($\alpha = 0.1$ × degree)

| Degree | $\alpha$ | Bias²   | Variance | Condition Number |
|:------:|:-------:|:-------:|:--------:|:----------------:|
| 2      | 0.0200  | 0.0576  | 0.0109   | 7.91e+00         |
| 3      | 0.0300  | 0.0000  | 0.0111   | 3.94e+01         |
| 4      | 0.0400  | 0.0000  | 0.0139   | 2.47e+02         |
| 5      | 0.0500  | 0.0001  | 0.0170   | 1.74e+03         |
| 6      | 0.0600  | 0.0001  | 0.0198   | 1.26e+04         |
| 7      | 0.0700  | 0.0001  | 0.0225   | 8.64e+04         |
| 8      | 0.0800  | 0.0001  | 0.0259   | 4.91e+05         |
| 9      | 0.0900  | 0.0001  | 0.0313   | 2.18e+06         |
| 10     | 0.1000  | 0.0001  | 0.0398   | 7.92e+06         |
| 11     | 0.1100  | 0.0002  | 0.0501   | 2.63e+07         |
| 12     | 0.1200  | 0.0002  | 0.0637   | 8.58e+07         |
| 13     | 0.1300  | 0.0002  | 0.0696   | 2.82e+08         |
| 14     | 0.1400  | 0.0004  | 0.1030   | 9.44e+08         |
| 15     | 0.1500  | 0.0007  | 0.1272   | 3.23e+09         |

- **Regularization controls variance even for high degrees.**
- **Condition number** stays manageable, preventing numerical instability.
- **Bias increases only minimally**, a small price for much lower variance at high degrees.

{{< 
figure src="../../images/bias-variance/bias_variance_stacked_regularized.png" 
num="3" 
id="regularized"
caption="Bias-Variance decomposition (adaptive regularization)" 
width="100%" 
>}}

---

# Conclusion

The **bias-variance tradeoff** is clearly illustrated by these experiments:

- Degree 3 is optimal for this cubic regression task.
- Without regularization, variance explodes beyond degree 10–12 due to numerical instability.
- Regularization ($\alpha$ increasing with degree) stabilizes high-degree fits, keeping variance and condition number controlled.
- The table and figures above reveal the subtle interplay between bias, variance, model complexity, and regularization.

<span style="color:crimson;font-weight:700">
This post or widget may be updated further - more notes, findings, and background will appear here!
</span>
