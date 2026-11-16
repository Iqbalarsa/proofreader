export interface AcademicSample {
  id: string;
  title: string;
  category: string;
  text: string;
}

export const ACADEMIC_SAMPLES: AcademicSample[] = [
  {
    id: 'cs-ai',
    title: 'Computer Science: Neural Attention Mechanisms',
    category: 'Informatics & AI',
    text: `The experimental results shows that the proposed attention mechanism significantly improves convergence speed during training. However, an neural network often suffer from catastrophic forgetting when trained on sequential tasks without proper regularization. Furthermore, each layers requires extensive parameter tuning to achieve optimal accuracy, and the model perform poorly on out-of-distribution datas. This study propose a novel architectural modification that mitigate these limitations while maintaining low computational complexity.`,
  },
  {
    id: 'biomed',
    title: 'Biomedical: CRISPR Expression & Pharmacokinetics',
    category: 'Biomedical Sciences',
    text: `Quantitative PCR analysis indicated that expression of target genes were markedly suppressed after forty-eight hours of incubation. The delivery vehicle exhibited low cytotoxicity in vitro, moreover, the cellular uptake rate was comparable to standard lipid nanoparticles. A careful evaluation of the pharmacokinetics demonstrate that plasma half-life increase when conjugated with polyethylene glycol. These findings suggest that the formulation offer a viable therapeutic strategy for targeted genetic disorders.`,
  },
  {
    id: 'economics',
    title: 'Economics: Monetary Policy & Inflation Expectations',
    category: 'Economics & Public Policy',
    text: `The econometric model estimate the impact of interest rate hikes on household consumer sentiment across urban districts. Empirical datas collected between 2021 and 2024 reveals that lower-income demographics is disproportionately affected by rising commodity prices. Although central banks aim to stabilize long-term inflation expectations, their recent policy decisions has generated unintended liquidity contractions in secondary credit markets. Consequently, fiscal policymakers must implements compensatory safety nets.`,
  },
];
