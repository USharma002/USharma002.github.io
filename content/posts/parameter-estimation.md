---
author: ["Utkarsh Sharma"]
title: "Parameter Estimation: From MLE to Full Bayesian Inference"
date: "2025-10-30"
description: "Maximum Likelihood, MAP and Bayesian Inference for probability estimation"
summary: "Maximum Likelihood, MAP and Bayesian Inference for probability estimation"
tags: ["Probability Estimation", "MLE"]
categories: ["machine-learning", "statistics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---



## Estimating probabilities of data

Suppose we have a coin and I want to know the probability of heads coming up when I throw it. One natural way to estimate this is to toss is $n$ (let's say $n = 10$) times, collect the outcomes/data $\mathcal{D}=\{H, T, H, T, T, H, T, H, T, T\}$ where we got $n_H=4$ heads and $n_T=6$ tails, so intuitively we can do following:
$$P(H) = \frac{n_H}{n_H + n_T}$$

Can we derive th above more formally ?

---

### Maximum Likelihood Estimate
The idea behind the maximum likelihood estimate (MLE) is to define a function of parameters that enable us to find a model that fits the data well. 

Given observations $\mathcal{D}=\lbrace x_1,\dots,x_n \rbrace $ and for a family of probability densities $p(x\mid \theta)$ parametrized by $\theta$, the likelihood of the data is given by $p(\mathcal{D}\mid \theta)$. The MLE principle is to find a $\hat{\theta}$ that maximzes the likelihood of data, $p(\mathcal{D}\mid \theta)$

$$\hat{\theta}_{MLE} = \arg\max_{\theta} p(\mathcal{D}\mid  \theta)$$

Often is is easier to work with the $log$ likelihood, so the optimization problem is posed as minimization of Negative Log Likelihood (NLL).

$$\hat{\theta}_{MLE} = \arg\min_{\theta} -\log p(\mathcal{D}\mid  \theta)$$

Here we are doing the **parameter estimation** to find the best model that minimizes the Negative Log Likelihood.

**Continuing Example**
Coming back to the above example, We can model the coin toss as a Binomial experiment with probability of heads being the parameter $\theta$. Thus the likelihood of data is given by:

$$p(\mathcal{D}\mid \theta) = {{n_H + n_T}\choose {n_H}} \theta^{n_H} (1 - \theta)^{n_T}$$

Plugging this in the MLE principle we get the following:






$$
\begin{aligned}
\hat{\theta}_{MLE} &= \arg\min_{\theta} -\log p(\mathcal{D}\mid  \theta) \\
                   &= \arg\min_{\theta} -\log\!\left( {{n_H + n_T}\choose {n_H}} \theta^{n_H} (1 - \theta)^{n_T} \right) \\
                   &= \arg\min_{\theta} -\log {{n_H + n_T}\choose {n_H}}
                      - \log \theta^{n_H} - \log(1 - \theta)^{n_T} \\
                   &= \arg\min_{\theta} -\log {{n_H + n_T}\choose {n_H}}
                      - n_H \log \theta - n_T \log(1 - \theta)
\end{aligned}
$$

We can solve for $\theta$ by taking derivative and equating with zero, we get:

$$\frac{n_H}{\theta} = \frac{n_T}{1-\theta}\Longrightarrow n_H - n_H\theta = n_T\theta\Longrightarrow \theta =\frac{n_H}{n_H + n_T}$$

We can check that $\theta\in[0,1]$

**Observations**
- If $n$ is large and model/distribution is correct (i.e., hypotheses class $\mathcal{H}$ includes the true model), then MLE finds the **true** parameters.
- MLE can overfit the data if $n$ is small but works well when $n$ is large (Asymptotic consistency).
- If you do not have the correct model (and $n$ is small) then MLE can be terribly wrong!
- MLE follows the frequentist statistis view where $\theta$ is a parameter so we can't have prior information associated directly.

**Continuing Example: Coin toss with prior knowledge**

Assume we have a hunch that $\theta$ is close to 0.5, but the sample size is small so you don't trst the estimate. How can we fix this using the prior/knwoledge?

Simple Fix: Add $m$ imaginary throws that would result in $\theta'$ (e.g. $\theta=0.5$). Add $m$ Heads and $m$ Tails to the data:
$$\hat\theta = \frac{n_H + m}{n_H + n_T + 2m}$$

---

### The Bayesian Way

Model $\theta$ as a **random variable**, draw form a distribution $p(\theta)$. <ins>Note</ins> that $\theta$ is **not** a random variable associated with an even in a sample space. In frequentist statistics, this is forbidden but in Bayesian statiscs, we can specify a prior belief $p(\theta)$ defining what values we believe $\theta$ is likely to take on.

Now, we can look at following:
$$p(\theta\mid  \mathcal{D}) = \frac{p(\mathcal{D}\mid \theta)p(\theta)}{p(\mathcal{D})} $$
where
- $p(\theta)$ us the **prior** distribution over the parameter(s) $\theta$, before we see any data.
- $p(\mathcal{D}\mid \theta)$ is the **likelihood** of the data given the parameter(s) $\theta$
- $p(\theta\mid \mathcal{D})$ is the **posterior** distribution over the parameter(s) **after** we have observerd the data.

A natural choice for the prior $p(\theta)$ is the Beta distribution:

$$p(\theta) = \frac{\theta^{\alpha - 1}(1-\theta)^{\beta - 1}}{B(\alpha,\beta)}$$

where $B(\alpha, \beta) = \frac{\Gamma(\alpha) \Gamma(\beta)}{\Gamma(\alpha + \beta)}$ is the normalization constant. Note that here we only need a distribution over a singly binary random variable $\theta$

Why is Beta distribution a good fit?
- it models probabilities ($\theta\in[0, 1]$)
- it is of the same distributional family as the binomial distribution (**conjugate prior**) $\rightarrow$ the math will turn out nicely.

So, we have distribution over $\theta$, how can we estimate $\theta$ ?

### Maximum a Posteriori Probaiblity (MAP)

We can choose $\hat\theta$ to be the <ins> most likely </ins>$\theta$<ins> given the data </ins>

**MAP Principle:** Find $\hat\theta$ that maximizes the posterior distribution $p(\theta\mid \mathcal{D})$

$$\hat{\theta}_{MAP} = \arg\max_{\theta} p(\theta\mid \mathcal{D})$$

$$\hat{\theta}_{MAP} = \arg\max_{\theta} \frac{p(\mathcal{D}\mid \theta)p(\theta)}{p(\mathcal{D})}$$

Here $p(\mathcal{D})$ is independent of $\theta$ so we get:

$$\hat{\theta}_{MAP} = \arg\min_{\theta} -\log p(\mathcal{D}\mid \theta) - \log p(\theta)$$


For the coin toss example, we assumed a Beta distribution, so we get the following:

$$p(\theta\mid \mathcal{D})\propto p(\mathcal{D}\mid \theta)p(\theta) \propto \theta^{n_H + \alpha - 1}(1 - \theta)^{n_T + \beta - 1}$$

Thus we get the folowing:
$$
\begin{aligned}
\hat{\theta}_{MAP} &= \arg\max_{\theta} p(\theta\mid \mathcal{D}) \\
                   &= \arg\max_{\theta} \frac{p(\mathcal{D}\mid \theta)p(\theta)}{p(\mathcal{D})} \\
                   &= \arg\min_{\theta} -[\log p(\mathcal{D}\mid \theta) + \log p(\theta)] \\
                   &= \arg\min_{\theta} -[n_H\log \theta + n_T\log(1-\theta)
                      +(\alpha-1)\log\theta + (\beta - 1)\log(1-\theta)] \\
                   &= \arg\min_{\theta} -[(n_H + \alpha - 1)\log\theta
                      + (n_T + \beta - 1)\log(1 - \theta)] \\
                   &\Longrightarrow \hat{\theta}_{MAP}
                      = \frac{n_H + \alpha - 1}{n_H + n_T + \alpha + \beta - 2}
\end{aligned}
$$
Some observation and properties:
- THE MAP estimate is identical to MLE with extra $-\log p(\theta)$ when minimizing NLL. This term is independent of the data and penalizes if the parameters, θ deviate too much from what we believe is reasonable (as a regularizer)
- MAP is a great estimator if an accurate prior beleif is available (and mathematically tractable).
- If $n$ is small, MAP can be very wrong if prior beleif if wrong.


### "True" Bayesian Approach

Both MLE and MAP are point estimators, i.e., in both cases we obtain a single-best value for $\theta$ so that the key algorithmic problem is solving an optimization problem. Once these point estimates $\theta^{\star}$ are knwon, we use them to make predictions. 

Focusing solely on some static of the posterior distribution (such as the parameter $\theta^{\star}$ that maximizes the posterior) leads to loss of informtaion, which can be critical in a system that uses the prediction $p(x\mid \theta^{\star})$ to make decisions. There is much more information  in the $p(\theta\mid \mathcal{D})$ and we are simply computing mode and throwing all other information away. A true Bayesian approach is to use the posterior predictive distribution directly to make prediction about the label $\mathcal{Y}$ of a test sample with features $\mathcal{X}$:

$$p(\mathcal{Y\mid \mathcal{D, X}}) = \int_{\theta}p(\mathcal{Y}, \theta\mid \mathcal{D}, \mathcal{X})d\theta = \int_{\theta}p(\mathcal{Y}\mid  \theta,\mathcal{D}, \mathcal{X})p(\theta\mid \mathcal{D})d\theta$$

Unfortunately, the above is generally *intractable* in closed form  and sampling techniques, such as Monte Carlo approximations, are used to approximate the distribution.

The coin toss examples is actually an exception for above. To make $predictions$ using $\theta$, we can use:

$$p(H\mid \mathcal{D}) = \int_\theta p(H, \theta\mid  \mathcal{D})d\theta$$

$$p(H\mid \mathcal{D}) = \int_\theta p(H \mid \theta, \mathcal{D})p(\theta\mid \mathcal{D})d\theta$$

$$p(H\mid \mathcal{D}) = \int_\theta \theta(\theta\mid \mathcal{D})d\theta$$

$$p(H\mid \mathcal{D}) = E[\theta\mid \mathcal{D}]$$
$$=\frac{n_H + \alpha}{n_H + \alpha + n_T + \beta}$$

Here, we assumed our data is drawn from Binomial Distribution so we could use the fact that $p(H\mid \mathcal{D}, \theta) = p(H\mid \theta)$, in general this would not hold


Observations:

- Parameter estimation via MLE or MAP estimation yields a consistent point estimate $\theta^\star$ of the parameters, and the key computational problem
to be solved is optimization. 
- Bayesian inference yields a (posterior) distribution, and the key computational problem to be solved is integration.
-  Bayesian inference gives us a principled way to incorporate prior knowledge, account for side information, and incorporate structural knowledge, all of which is not easily done in the context of parameter estimation.
- Moreover, the propagation of parameter uncertainty to the prediction can be valuable in decision-making systems for risk assessment and exploration in the context of data-efficient learning

### Latent-Variable Models

In practice, it is sometimes useful to have additional *latent* variables $z$ (besides model parameters $\theta$) as part of the model. These latent variables do not parameterize the model explicitly but may describe the data-generating process, thereby contributing to the interpretability of the model. They also often simplify the structure of the model and allow us to define simple and richer model structures.

Learning in latent-variable models (at least via MLE) can be done in a principled way using the expectation maximization (EM) algorithm.

Since latent-variable models allow use to define the process that generates data from parameters, let us have look at this generative process. We can get the distribution

$$p(\mathcal{D}\mid z, \theta)$$

that allows us to generate data for any model parameters and latent variables.

Since the likelihood function $p(\mathcal{D}\mid \theta)$ is the predictive distribution of the data given model parameters, we need to marginalize out the latent variables.

$$p(\mathcal{D}\mid \theta) = \int p(\mathcal{D}\mid z, \theta)p(z)dz$$

Note that the likelihood must not depend on the latent variables $z$, but it is only a function of data $\mathcal{D}$ and model parameters $\theta$.

One challenge we have in this latent-variable model is that likelihood $p(\mathcal{D}\mid \theta)$ requires marginalization of the latent variables. Except when we choose a conjugate prior $p(z)$, the marginalization is not analytically tractable and we need to resort to approximations.

Similar to parameter posterios, we can compute a posterior on the latent variables according to 

$$p(z\mid \mathcal{D}) = \frac{p(\mathcal{D}\mid z)p(z)}{p(\mathcal{D})},  p(\mathcal{D}\mid z) = \int p(\mathcal{D}\mid z, \theta)p(\theta)d\theta$$


A quantity that is  easier to compute is the posterios distribution on the latent variables, but conditioned on the model parameters, i.e.,

$$p(z\mid \mathcal{D}, \theta) = \frac{p(\mathcal{D}\mid z, \theta)p(z)}{p(\mathcal{D}\mid \theta)}$$

We've now set up the framework for latent-variable models. While the marginalization in latent-variable models is generally intractable, the Expectation-Maximization (EM) algorithm provides a principled way to perform MLE in this setting. We'll explore EM in detail with Gaussian Mixture Models in a future post

---
## References

1. Deisenroth, M. P., Faisal, A. A., & Ong, C. S. (2020). *Mathematics for Machine Learning*. Cambridge University Press.
2. Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.  
3. Cornell University CS4780/5780: *Machine Learning for Intelligent Systems* Lecture Notes.  
