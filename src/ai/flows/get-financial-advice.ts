'use server';
/**
 * @fileOverview A financial advice AI agent.
 *
 * - getFinancialAdvice - A function that handles the financial advice process.
 * - FinancialAdviceInput - The input type for the getFinancialAdvice function.
 * - FinancialAdviceOutput - The return type for the getFinancialAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
  id: z.string(),
  category: z.string(),
  amount: z.number(),
  date: z.string(),
  type: z.enum(['expense', 'income']),
});

const EmiSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  monthsRemaining: z.number(),
  paymentDate: z.string(),
});

const AutopaySchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  paymentDate: z.string(),
  category: z.enum(['Subscription', 'Investment', 'Insurance', 'Other']),
  frequency: z.enum(['Monthly', 'Quarterly', 'Yearly']),
});


const FinancialAdviceInputSchema = z.object({
  budget: z.number().describe("The user's total monthly budget."),
  transactions: z.array(TransactionSchema).describe("A list of the user's recent transactions."),
  emis: z.array(EmiSchema).describe("A list of the user's ongoing EMIs."),
  autopays: z.array(AutopaySchema).describe("A list of the user's recurring autopayments."),
});
export type FinancialAdviceInput = z.infer<typeof FinancialAdviceInputSchema>;

const FinancialAdviceOutputSchema = z.object({
  advice: z.string().describe('A short, actionable financial advice tip based on the user\'s data. Should be concise and easy to understand. Provide only one single tip.'),
});
export type FinancialAdviceOutput = z.infer<typeof FinancialAdviceOutputSchema>;

export async function getFinancialAdvice(input: FinancialAdviceInput): Promise<FinancialAdviceOutput> {
  return getFinancialAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAdvicePrompt',
  input: {schema: FinancialAdviceInputSchema},
  output: {schema: FinancialAdviceOutputSchema},
  prompt: `You are a helpful financial assistant. Your goal is to provide a single, short, actionable piece of advice to the user based on their financial data. Analyze the user's budget, income, expenses, EMIs, and autopayments. Identify one key area for improvement or a positive habit to reinforce.

  - The advice should be encouraging and non-judgmental.
  - Keep it concise, ideally one or two sentences.
  - Focus on one specific insight. Do not provide a list of tips.
  - If there is not enough data, provide a general financial tip.

  User's Financial Data:
  - Monthly Budget: {{{budget}}}
  - Transactions: {{{json transactions}}}
  - EMIs: {{{json emis}}}
  - Autopayments: {{{json autopays}}}
  `,
});

const getFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'getFinancialAdviceFlow',
    inputSchema: FinancialAdviceInputSchema,
    outputSchema: FinancialAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
