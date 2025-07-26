'use server';

/**
 * @fileOverview Generates personalized financial advice based on user's expenses and EMIs.
 *
 * - generateFinancialAdvice - A function that generates financial advice.
 * - FinancialAdviceInput - The input type for the generateFinancialAdvice function.
 * - FinancialAdviceOutput - The return type for the generateFinancialAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialAdviceInputSchema = z.object({
  expenses: z.array(
    z.object({
      category: z.string().describe('The category of the expense (e.g., food, travel).'),
      amount: z.number().describe('The amount spent on the expense.'),
    })
  ).describe('A list of expenses with their categories and amounts.'),
  emis: z.array(
    z.object({
      category: z.string().describe('The category of the EMI (e.g., home loan, car loan).'),
      amount: z.number().describe('The amount of the EMI.'),
    })
  ).describe('A list of EMIs with their categories and amounts.'),
  monthlyBudget: z.number().optional().describe('The user set monthly budget, if any.'),
});
export type FinancialAdviceInput = z.infer<typeof FinancialAdviceInputSchema>;

const FinancialAdviceOutputSchema = z.object({
  advice: z.string().describe('Personalized financial advice based on the provided expenses and EMIs.'),
});
export type FinancialAdviceOutput = z.infer<typeof FinancialAdviceOutputSchema>;

export async function generateFinancialAdvice(input: FinancialAdviceInput): Promise<FinancialAdviceOutput> {
  return generateFinancialAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAdvicePrompt',
  input: {schema: FinancialAdviceInputSchema},
  output: {schema: FinancialAdviceOutputSchema},
  prompt: `You are a financial advisor. Based on the user's expenses, EMIs, and monthly budget, provide personalized financial advice.

Here are the user's expenses:
{{#each expenses}}
- Category: {{category}}, Amount: {{amount}}
{{/each}}

Here are the user's EMIs:
{{#each emis}}
- Category: {{category}}, Amount: {{amount}}
{{/each}}

{{#if monthlyBudget}}
The user's monthly budget is {{monthlyBudget}}.
{{/if}}

Provide advice on how the user can better manage their finances, reduce expenses, and save money. Be specific and actionable.`,
});

const generateFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'generateFinancialAdviceFlow',
    inputSchema: FinancialAdviceInputSchema,
    outputSchema: FinancialAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
