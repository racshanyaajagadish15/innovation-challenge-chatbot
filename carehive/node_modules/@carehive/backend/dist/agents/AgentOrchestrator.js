import { CareAgent } from './CareAgent.js';
import { LifestyleAgent } from './LifestyleAgent.js';
import { EmotionalAgent } from './EmotionalAgent.js';
import { ClinicianAgent } from './ClinicianAgent.js';
import { logger } from '../utils/logger.js';
const AGENTS = [CareAgent, LifestyleAgent, EmotionalAgent, ClinicianAgent];
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
/**
 * Run all agents in parallel, then merge and deduplicate interventions
 */
export async function runOrchestrator(context) {
    logger.info('Orchestrator running', { userId: context.userId });
    const outputs = await Promise.all(AGENTS.map(async (agent) => {
        try {
            const analysis = await agent.analyze(context);
            const decision = await agent.decide(context, analysis);
            const result = await agent.act(context, analysis, decision);
            return result;
        }
        catch (err) {
            logger.error(`Agent ${agent.type} failed`, err);
            return null;
        }
    }));
    const agentOutputs = outputs.filter((o) => o !== null);
    const interventions = [];
    for (const out of agentOutputs) {
        for (const action of out.actions) {
            if (action.type === 'create_intervention' && typeof action.payload === 'object' && action.payload !== null) {
                const p = action.payload;
                if (p.message) {
                    interventions.push({
                        id: `orch-${Date.now()}-${out.agentType}`,
                        userId: context.userId,
                        agentType: out.agentType,
                        message: p.message,
                        priority: p.priority ?? 'medium',
                        read: false,
                        createdAt: new Date(),
                    });
                }
            }
        }
    }
    // Resolve conflicts: dedupe by similar message, sort by priority
    const deduped = dedupeInterventions(interventions);
    const sorted = [...deduped].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) -
        (PRIORITY_ORDER[b.priority] ?? 2));
    const summary = agentOutputs.length > 0
        ? `Orchestrator completed: ${agentOutputs.map((o) => o.agentType).join(', ')} produced ${sorted.length} intervention(s).`
        : 'No agent outputs.';
    return {
        interventions: sorted,
        agentOutputs,
        summary,
    };
}
function dedupeInterventions(list) {
    const seen = new Set();
    return list.filter((i) => {
        const key = `${i.agentType}:${i.message.slice(0, 40)}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
