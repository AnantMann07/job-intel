# Job suggestion evaluation

20,000 held-out postings used as pretend candidates; job profiles built from 697,861 other postings; 12 jobs to choose from.

| Method | Hit@1 | Hit@3 | MRR |
| --- | --- | --- | --- |
| Our score: 0.5 cosine + 0.3 coverage + 0.2 demand | 52.0% | 84.8% | 0.698 |
| Cosine similarity only | 28.1% | 69.3% | 0.523 |
| Coverage only | 30.5% | 70.2% | 0.536 |
| Baseline: most common jobs first | 24.0% | 86.4% | 0.532 |

Hit@k: the posting's real job is in the top k suggestions. MRR: average of 1/rank (1 = always first).
Note: similar data jobs share many skills (e.g. sql and python), so Hit@3 is the fairer measure of usefulness.
