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

Out goal is to reduce the Error, while we cannot reduce the inherent noise, we can try to reduce the bias or the variance.

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
$$
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

Apply WLLN to predictors: assume we have $m$ training sets $D_1, D_2, \dots, D_m$ drawn from $p^n$, train a predictor on each one, and average results:

$$
\hat{h} = \frac{1}{m} \sum_{i=1}^m h_{D_i} \to \bar{h} \qquad \text{as } m \to \infty.
$$

We refer to such an average of multiple predictors as an ensemble of predictors. 

**Good news:** If $\hat{h}\rightarrow\bar{h}$ the variance component of the error must also vanish, i.e. $$\mathbb{E}_{x,D}\left[\left(h_D(x) - \bar{h}(x)\right)^2\right] \rightarrow 0 $$

**Problem:** We don't have $m$ data sets $D1,\dots,D_m$, we only have $D$.

## Bagging (Bootstrap Aggregating)

Simulate drawing from $p$ by drawing uniformly with replacement from the set $D$.
i.e. let $q(x_i,y_i\mid D)$ be a probability distribution that picks a training sample $(x_i,y_i)$ from $D$ uniformly at random. More formally, 
$$q((x_i,y_i)\mid D)=\frac{1}{n} \quad \forall(x_i,y_i)\in D \text{ with } n=|D|.$$

We sample the set $D_i∼q^n$, i.e. $|D_i|=n$, and $D_i$ is picked with replacement from $q|D$.

**Bagged predictor:**  $$\hat{h} =\frac{1}{m} \sum_{i=1}^{m} h_{D_i}$$

Notice that for the bagged predictor: 
$$
\hat{h} =\frac{1}{m} \sum_{i=1}^{m} h_{D_i} \nrightarrow \bar{h}
$$ 

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

---

### Variance of Bagged Estimator
The variance of the bagged estimator is:

$$Var(\hat{h}(x)) = Var\left( \frac{1}{m}\sum_{i=1}^{m} h_{D_i} \right)$$

If each model has variance $\sigma^2$ and pairwise correlation $\rho$, then:

$$Var(\hat{h}(x)) = \rho \sigma^2 + \frac{1 - \rho}{m}\sigma^2$$

><details>
><summary style="cursor: pointer;">Proof</summary>
>
>$$
\operatorname{Var}(\hat{h}(x)) = \operatorname{Var}\!\left(\frac{1}{m}\sum_{i=1}^m h_i(x)\right)
= \frac{1}{m^2}\operatorname{Var}\!\left(\sum_{i=1}^m h_i(x)\right).
$$
>
>For any random variables,
>
>$$
\operatorname{Var}\!\left(\sum_{i=1}^m h_i\right) = \sum_{i=1}^m \operatorname{Var}(h_i) + \sum_{i \neq j} \operatorname{Cov}(h_i, h_j).
$$
>
>Plugging in our assumptions:
>
>- $\sum_{i=1}^m \operatorname{Var}(h_i) = m\sigma^2$  
>- There are $m(m-1)$ ordered pairs $(i,j)$ with $i \neq j$,    and $\operatorname{Cov}(h_i, h_j) = \rho\sigma^2$ for all $i \neq j$
>
>Thus,
>
>$$
\operatorname{Var}\left(\sum_{i=1}^m h_i\right) = m\sigma^2 + m(m-1)\rho\sigma^2.$$
>
>Now,
>
>$$
\operatorname{Var}(\hat{h}(x))
= \frac{1}{m^2} \big( m\sigma^2 + m(m-1)\rho\sigma^2 \big)
= \sigma^2 \frac{1 + (m-1)\rho}{m}.
$$
>
>Rearrange to separate the correlated and averaging parts:
>
>$$
\operatorname{Var}(\hat{h}(x)) = \rho\sigma^2 + \frac{1-\rho}{m}\sigma^2.
$$
>
>(Proof of equivalence:  $\rho + \frac{1-\rho}{m} = \frac{\rho m + 1 - \rho}{m} = \frac{1 + (m - 1)\rho}{m}$.)
>
</details>

Notice that we can have 3 cases here:
- **Models are Independent**, in which case the variance is reduced by a factor of $m$ since $\rho = 0$

- **Modela are not prefectly correlated**, in which case the reduction depends on $\rho$

- **Modela are prefectly correlated**, so no variance reduction at all.

**Why the models are not independent**  
Even though the bootstrap sampling is random, the models $h_{D_i}$ are **not independent** because:  
- All $D_i$ are sampled from the **same original dataset $D$**.  
- The models $h_{D_i}$ share **overlapping data points**, thus the resulting models $h_{D_i}$ are **statistically dependent**. 

**But how much data can we expect to be common among them?**

We have an original dataset $D$ of size $n$ (distinct items).  
Two bootstrap samples $D_i$ and $D_j$ are drawn independently by sampling $n$ items **with replacement** from $D$.

Let

$$
S = |\text{unique}(D_i) \cap \text{unique}(D_j)|
$$

be the number of **distinct original items** that appear in both bootstrap samples.  
(This is the usual meaning of “intersection” in the bagging context.)

---

### Derivation

For a fixed original item $k$ (one of the $n$ items), let

$$
I_k =
\begin{cases}
1 & \text{if item } k \text{ appears at least once in } D_i, \\
0 & \text{otherwise.}
\end{cases}
$$

Similarly, define $J_k$ for $D_j$. Then

$$
S = \sum_{k=1}^{n} I_k J_k,
$$

so by linearity of expectation,

$$
\mathbb{E}[S] = \sum_{k=1}^{n} \Pr(I_k = 1 \text{ and } J_k = 1).
$$

Because the two bootstrap draws are independent and symmetric across items,

$$
\Pr(I_k = 1 \text{ and } J_k = 1)
= \Pr(I_k = 1)\Pr(J_k = 1)
= p^2,
$$

where

$$
p = \Pr(\text{a given item appears at least once in one bootstrap sample})
   = 1 - \left(1 - \frac{1}{n}\right)^{n}.
$$

Hence,

$$
\boxed{\mathbb{E}[\,|D_i \cap D_j|\,] = n \left( 1 - \left(1 - \frac{1}{n}\right)^{n} \right)^2.}
$$

---

### Large-$n$ Approximation

As $n \to \infty$,

$$
\left(1 - \frac{1}{n}\right)^{n} \to e^{-1}.
$$

Therefore,

$$
\mathbb{E}[\,|D_i \cap D_j|\,] \approx n (1 - e^{-1})^2
   \approx n (0.63212056)^2
   \approx 0.3996\,n.
$$

So about **40% of the original items (on average)** appear in both bootstrap samples.

---

### Intuition

- Probability that an item appears in one bootstrap sample: $p \approx 0.632$
- Probability that it appears in both: $p^2 \approx 0.3996$
- Thus, two bootstrap samples share roughly **$0.4n$** distinct items on average.

----

## Bagging Summary

You have a dataset $
D = \{(x_1, y_1), \dots, (x_n, y_n)\}$ of size $n$.

1. **Create bootstrap samples**  
   You create $m$ bootstrap samples $D_1, \dots, D_m$, where each $D_i$ is sampled **with replacement** from $D$.  
   - Each $D_i$ has size $n$.  
   - Some points may appear multiple times; some may be missing.

2. **Train models**  
   You train a model $h_{D_i}$ on each bootstrap sample $D_i$.

3. **Compute the bagged predictor**  
   The bagged predictor is the average:

   $$
   \hat{h} = \frac{1}{m} \sum_{i=1}^{m} h_{D_i}.
   $$


In practice larger $m$ results in a better ensemble, however at some point you will obtain **diminishing returns**. Note that setting $m$ unnecessarily high will only slow down your classifier but will not increase the error of your classifier. 


## Advantages of Bagging
- Easy to implement
- Reduces variance, so has a strong beneficial effect on high variance classifiers.
- As prediction is an average of many classifier, we can obtain a mean score and variance which can be interpreted as the uncertainity of the prediction (especially in regression tasks)

- Bagging provides an unbiased estimate of the test error, which we refer to as the **out-of-bag error**. The idea is that each training point was not picked and all the data sets $D_k$. If we average the classifiers $h_k$ of all such data sets, we obtain a classifier (with a slightly smaller $m$) that was not trained on $(x_i, y_i)$ ever and it is therefore equivalent to a test sample. If we compute the error of all these classifiers, we obtain an estimate of the true test error. The beauty is that we can do this without reducing the training set. We just run bagging as it is intended and obtain this so called out-of-bag error for free.

  More formally, for each training point $(x_i, y_i) \in D$
  let 

  $$
  S_i = \{k \mid (x_i, y_i) \notin D_k\}
  $$

  - in other words $S_i$ is a set of all the training sets $D_k$, which do not contain $(x_k, y_k)$. Let the averaged classifier over all these data sets be

  $$
  \tilde{h}_i(x) = \frac{1}{|S_i|} \sum_{k \in S_i} h_k(x).
  $$

  The out-of-bag error becomes simply the average error/loss that all these classifiers yield

  $$
  \epsilon_{\text{OOB}} = \frac{1}{n} \sum_{(x_i, y_i) \in D} l(\tilde{h}_i(x_i), y_i).
  $$

  This is an estimate of the test error, because for each training point we used the subset of classifiers that never saw that training point during training. If $m$ is sufficiently large, the fact that we take out some classifiers has no significant effect and the estimate is pretty reliable.

## Random Forest

One of the most famous and useful bagged algorithms is the **Random Forest**!  
A Random Forest is essentially nothing else but **bagged decision trees**, with a slightly modified splitting criterion.

---

### Algorithm

1. **Bootstrap Sampling**

   Sample $m$ datasets $D_1, \dots, D_m$ from $D$ **with replacement**.

2. **Train Trees**

   For each dataset $D_j$, train a **full decision tree** $h_j(\cdot)$ (i.e., with `max-depth = ∞`)  
   but with one small modification:

   - Before each split, **randomly subsample** $k \le d$ features (without replacement),  
     and only consider these features for the split.  
   - This additional randomness further **increases the variance** of the trees, making the ensemble more robust.

3. **Aggregate Predictions**

   The final classifier is given by:

   $$
   h(x) = \frac{1}{m} \sum_{j=1}^{m} h_j(x)
   $$

---

### Why Random Forests Work So Well

The Random Forest (RF) is one of the **best, most popular, and easiest-to-use out-of-the-box classifiers**.  
There are two main reasons for this:

1. **Few and Stable Hyperparameters**

   - The RF only has two main hyperparameters: $m$ and $k$.
   - It is **extremely insensitive** to both of these.
   - A good rule of thumb for $k$ is:

     $$
     k = \sqrt{d}
     $$

     where $d$ denotes the number of features.
   - You can set $m$ as **large as you can afford computationally**.

2. **Minimal Preprocessing Requirements**

   Decision trees do not require much preprocessing.  
   Features can have **different scales, magnitudes, or units**, and trees will still perform well.

<span style="color:crimson;font-weight:700">
This post or widget may be updated further - more notes, findings, and background will appear here!
</span>
