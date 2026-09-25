Let \(A,B\) be independently and uniformly drawn from the integers \(10,\dots,99\), and define the low word

$$
L=(AB)\bmod 100,
$$

so \(L\) is simply the last two decimal digits of the product, interpreted as an integer from \(0\) to \(99\).

There are

$$
90^2=8100
$$

ordered pairs \((A,B)\).

The exact expected value is

$$
\boxed{E[L]=47.916\overline{6}}
$$

so the mean low word is slightly below \(49.5\), which is what it would be under a perfectly uniform distribution on \(0,\dots,99\).

The distribution is very far from uniform, though. Here are the exact counts out of 8100. Rows are the tens digit of \(L\), columns are the ones digit.

| tens \ ones |   0 |  1 |   2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
| ----------- | --: | -: | --: | -: | --: | --: | --: | -: | --: | -: |
| 0x          | 297 | 33 |  66 | 34 | 131 |  64 |  68 | 34 | 132 | 35 |
| 1x          | 136 | 32 | 132 | 32 |  66 |  64 | 131 | 32 |  68 | 32 |
| 2x          | 280 | 34 |  64 | 32 | 132 | 113 |  64 | 34 | 130 | 32 |
| 3x          | 136 | 32 | 130 | 32 |  64 |  64 | 131 | 32 |  64 | 32 |
| 4x          | 280 | 32 |  66 | 32 | 128 |  64 |  64 | 32 | 130 | 33 |
| 5x          | 234 | 32 | 128 | 32 |  66 |  62 | 130 | 32 |  64 | 32 |
| 6x          | 278 | 32 |  64 | 34 | 129 |  62 |  64 | 32 | 128 | 32 |
| 7x          | 134 | 32 | 130 | 32 |  64 | 112 | 128 | 32 |  64 | 32 |
| 8x          | 278 | 33 |  64 | 32 | 128 |  62 |  64 | 32 | 128 | 32 |
| 9x          | 134 | 32 | 128 | 32 |  64 |  62 | 128 | 32 |  64 | 32 |

So, for example,

$$
P(L=0)=\frac{297}{8100}\approx 3.667\%,
$$

while

$$
P(L=11)=\frac{32}{8100}\approx0.395\%.
$$

Uniform would be exactly \(1\%\) for every residue.

A few things jump out immediately:

* \(\boxed{00}\) is the most common low word: 297 occurrences.
* \(20\) and \(40\) are next at 280 each.
* \(60\) and \(80\) occur 278 times each.
* \(50\) occurs 234 times.
* Many odd residues occur only 32–35 times, around \(0.4\%\).

The reason is number-theoretic. Since

$$
100=4\cdot25=2^2 5^2,
$$

products containing factors of \(2\) and \(5\) pile up disproportionately on residues divisible by \(10,20,25,50,\) etc. In particular, there are many different ways for two two-digit integers to accumulate enough factors of \(2\) and \(5\) that their product ends in `00`.

Odd low words are much more constrained. For \(AB\) to be odd, both \(A\) and \(B\) must be odd, which already reduces the available pairs to roughly one quarter of the sample space.

There's also a striking units-digit pattern. Summing over the tens digit gives:

| Last digit | Count | Probability |
| ---------- | ----: | ----------: |
| 0          |  2153 |      26.58% |
| 1          |   324 |       4.00% |
| 2          |  1070 |      13.21% |
| 3          |   322 |       3.98% |
| 4          |   976 |      12.05% |
| 5          |   729 |       9.00% |
| 6          |  1034 |      12.77% |
| 7          |   322 |       3.98% |
| 8          |   972 |      12.00% |
| 9          |   324 |       4.00% |

So more than a quarter of all products end in **0**, whereas only about 4% end in each of \(1,3,7,9\).

One subtlety: this treats \((23,47)\) and \((47,23)\) as separate dyads. If by “dyads” you meant **unordered pairs**, the distribution changes slightly because diagonal pairs receive different weight.
