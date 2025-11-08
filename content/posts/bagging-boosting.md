---
author: ["Utkarsh Sharma"]
title: "Bagging and Boosting"
date: "2025-11-08"
description: "Explore bagging and boosting in machine learning, including variance reduction, bias management, and ensemble classifier construction"
summary: "Explore bagging and boosting in machine learning, including variance reduction, bias management, and ensemble classifier construction"
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


# Bias Variance Decomposition

Remember the Bias / Variance decomposition: 
$$
\underbrace{\mathbb{E}_{x, y, D}\!\left[\left(h_{D}(x) - y\right)^{2}\right]}_{\text{Expected Test Error}} = \underbrace{\mathbb{E}_{x, D}\!\left[\left(h_{D}(x) - \bar{h}(x)\right)^{2}\right]}_{\text{Variance}} + \underbrace{\mathbb{E}_{x, y}\!\left[\left(\bar{y}(x) - y\right)^{2}\right]}_{\text{Noise}} + \underbrace{\mathbb{E}_{x}\!\left[\left(\bar{h}(x) - \bar{y}(x)\right)^{2}\right]}_{\text{Bias}^2}
$$

Out goal if to reduce the Error, while we cannot reduce the inherent noise, we can try to reduce the bias or the variance.

# Reducing Variance
> ### Weak Law of Large Numbers
>
> Given $X_1, X_2, \dots$ an infinite sequence of i.i.d. random variables with finite expected value
>
> $$
 \mathbb{E}[X_1] = \mathbb{E}[X_2] = \dots = \mu < \infty,
 $$
>
> the weak law of large numbers states:
>
> $$
 \overline{X}_n \ \overset{P}{\rightarrow} \ \mu \qquad \text{as } n \to \infty.
 $$
>
><details>
><summary style="cursor: pointer;">Proof</summary>
>
>This proof uses the assumption of finite variance $\operatorname{Var}(X_i) = \sigma^2$ (for all $i$). The independence of the random variables implies no correlation between them, and we have:
>
>$$
\operatorname{Var}(\overline{X}_n) = \operatorname{Var}\Big(\frac{1}{n}(X_1 + \dots + X_n)\Big) 
= \frac{1}{n^2} \operatorname{Var}(X_1 + \dots + X_n) 
= \frac{n \sigma^2}{n} 
= \frac{\sigma^2}{n}.
$$
>
> The mean of the sample average is:
>
>$$
\mathbb{E}[\overline{X}_n] = \mu.
$$
>
>Using Chebyshev's inequality on $\overline{X}_n$ gives:
>
>$$
\operatorname{P}\left(\left|\overline{X}_n - \mu\right| \ge \varepsilon\right) \le \frac{\sigma^2}{n \varepsilon^2}.
>$$
>
>Equivalently:
>
>$$
\operatorname{P}\left(\left|\overline{X}_n - \mu\right| < \varepsilon\right) 
= 1 - \operatorname{P}\left(\left|\overline{X}_n - \mu\right| \ge \varepsilon\right) 
\ge 1 - \frac{\sigma^2}{n \varepsilon^2}.
$$
>
>As $n \to \infty$, the right-hand side approaches 1. By definition of convergence in probability:
>
>$$
\overline{X}_n \ \overset{P}{\rightarrow} \ \mu \qquad \text{as } n \to \infty. \quad \blacksquare
$$
>
></details>

---

Our goal is to reduce the variance term:
$
\mathbb{E}_{x,D}\left[\left(h_D(x) - \bar{h}(x)\right)^2\right].
$

For this, we need that $h_D \to \bar{h}$.  

Apply WLLN to classifiers: assume we have $m$ training sets $D_1, D_2, \dots, D_m$ drawn from $p^n$, train a classifier on each one, and average results:

$$
\hat{h} = \frac{1}{m} \sum_{i=1}^m h_{D_i} \to \bar{h} \qquad \text{as } m \to \infty.
$$

We refer to such an average of multiple classifiers as an ensemble of classifiers. 

**Good news:** If $\hat{h}\rightarrow\bar{h}$ the variance component of the error must also vanish, i.e. $$\mathbb{E}_{x,D}\left[\left(h_D(x) - \bar{h}(x)\right)^2\right] \rightarrow 0 $$

**Problem:** We don't have $m$ data sets $D1,\dots,D_m$, we only have $D$.

## Bagging (Bootstrap Aggregating)

Simulate drawing from $p$ by drawing uniformly with replacement from the set $D$.
i.e. let $q(x_i,y_i\mid D)$ be a probability distribution that picks a training sample $(x_i,y_i)$ from $D$ uniformly at random. More formally, 
$$q((x_i,y_i)\mid D)=\frac{1}{n} \quad \forall(x_i,y_i)\in D \text{ with } n=|D|.$$

We sample the set $D_i∼q^n$, i.e. $|D_i|=n$, and $D_i$ is picked with replacement from $q|D$.

**Bagged classifier:**  $$\hat{h}_D =\frac{1}{m} \sum_{i=1}^{m} h_{D_i}$$

Notice that for the bagged classifier: 
$$\hat{h}_D =\frac{1}{m} \sum_{i=1}^{m} h_{D_i} \nrightarrow 0 $$ 
because the samples are not i.i.d. so cannot use W.L.L.N here, W.L.L.N only works for i.i.d. samples.


## Analysis
Although we cannot prove that the new samples are i.i.d., we can show that they are drawn from the original distribution $p$. Assume $p$ is discrete, with $p(X=x_i)=p_i$ over some set $\Omega = x_1,\dots, x_N$ ($N$ very large) (let's ignore the label for now for simplicity) 

$$
\begin{equation*}
\begin{aligned}
    q(X=x_i)&= \underbrace{{\sum_{k = 1}^{n}}{n\choose k}p_i^k(1-p_i)^{n-k}}_{\substack{\text{Probability that are}\\\text{k copies of $x_i$ in D}}} \underbrace{\frac{k}{n}}_\mathrm{\substack{\text{Probability}\\\text{pick one of}\\\text{these copies}}}\\
    &=\frac{1}{n}\underbrace{{\sum_{k = 1}^{n}}{n\choose k}p_i^k(1-p_i)^{n-k}k}_{\substack{\text{Expected value of}\\\text{Binomial Distribution}\\\text{with parameter $p_i$}\\\mathbb{E}[\mathbb{B}(p_i,n)]=np_i}}\\
    &=\frac{1}{n}np_i\\
    &=p_i\leftarrow\text{Each data set $D'_l$ is drawn from p, but not independently.}
    \end{aligned}
\end{equation*}
$$



There is a simple intuitive argument why $p(X=x_i)=q(X=x_i)$. 

So far we assumed that you draw $D$ from $p^n$ and then $q$ picks a sample from $D$. However, you don't have to do it in that order. You can also view sampling from $q$ in reverse order: 

Consider that you first use $q$ to reserve a "spot" in $D$, i.e. a number from $1,\dots,n$ where $i$ means that you sampled the $i^{th}$ data point in $D$. So far you only have the slot, $i$, and you still need to fill it with a data point $(x_i,y_i)$. You do this by sampling $(x_i,y_i)$ from $p$. It is now obvious that which slot you picked doesn't really matter, so we have $q(X=x)=p(X=x)$.

## Bagging Summary

You have a dataset $
D = \{(x_1, y_1), \dots, (x_n, y_n)\}$ of size $n$.

1. **Create bootstrap samples**  
   You create $m$ bootstrap samples $D_1, \dots, D_m$, where each $D_i$ is sampled **with replacement** from $D$.  
   - Each $D_i$ has size $n$.  
   - Some points may appear multiple times; some may be missing.

2. **Train models**  
   You train a model $h_{D_i}$ on each bootstrap sample $D_i$.

3. **Compute the bagged classifier**  
   The bagged classifier is the average:

   $$
   \hat{h}_D = \frac{1}{m} \sum_{i=1}^{m} h_{D_i}.
   $$

**Why the models are not independent**  
Even though the bootstrap sampling is random, the models $h_{D_i}$ are **not independent** because:  
- All $D_i$ are sampled from the **same original dataset $D$**.  
- The models $h_{D_i}$ share **overlapping data points**, thus the resulting models $h_{D_i}$ are **statistically dependent**. 

In practice larger $m$ results in a better ensemble, however at some point you will obtain **diminishing returns**. Note that setting $m$ unnecessarily high will only slow down your classifier but will not increase the error of your classifier. 

<span style="color:crimson;font-weight:700">
This post or widget may be updated further - more notes, findings, and background will appear here!
</span>
