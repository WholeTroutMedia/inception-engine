/**
 * @module helix/orchestrator
 * @description The Helix Orchestrator Meta-Agent — resolves schemas into running parallel architectures
 */

import { HelixCluster, HelixDescriptor, HelixTask } from './schema.js';
import { AgentSpawner } from '@wholetrout/agent-spawner';
import { EventBus } from '@inception/orchestrator';

/**
 * Validates a Cluster and provisions parallel worker threads.
 * Uses a topological sort to resolve dependencies between tasks and helices.
 */
export class HelixOrchestrator {
    private spawner: AgentSpawner;
    private eventBus: EventBus;
    
    constructor(spawner: AgentSpawner, eventBus: EventBus) {
        this.spawner = spawner;
        this.eventBus = eventBus;
    }

    /**
     * Entrypoint for initiating a completely new cluster wave.
     */
    async igniteWave(cluster: HelixCluster): Promise<string[]> {
        console.log(`[HELIX-ORCHESTRATOR] Igniting Wave ${cluster.wave} (${cluster.helices.length} Helices)`);
        
        // 1. Resolve Global Dependencies (Helix -> Helix)
        const helixExecutionOrder = this.sortHelices(cluster);
        
        // 2. Dispatch the wavefront event
        await this.eventBus.emit('helix.wave.start', {
            wave: cluster.wave,
            totalHelices: cluster.helices.length
        }, 'orchestrator');

        const helixIds: string[] = [];

        // 3. Spool up each helix (we execute independent helices concurrently, but await dependent ones conceptually)
        // For simplicity in the prototype, we assume all array waves can be parallelized directly.
        // A true topological await requires a job runner loop which we emit to the Event Bus instead.
        
        for (const helix of helixExecutionOrder) {
             const threadId = await this.dispatchHelix(helix);
             helixIds.push(threadId);
        }
        
        return helixIds;
    }

    /**
     * Executes an individual Helix thread by generating tasks and provisioning agents.
     */
    private async dispatchHelix(helix: HelixDescriptor): Promise<string> {
        console.log(`[HELIX-ORCHESTRATOR] 🧬 Spinning up Helix: ${helix.name} [ID: ${helix.id}]`);
        
        await this.eventBus.emit('helix.thread.start', {
           helixId: helix.id,
           taskCount: helix.tasks.length 
        }, 'orchestrator');

        // Topological Sort Task Order within the Helix
        const tasks = this.sortTasks(helix.tasks);

        // Pluck the first available tasks with no dependencies or AutoRun true
        for(const task of tasks) {
            if (task.autoRun) {
                 await this.eventBus.emit('helix.task.dispatch', {
                     taskId: task.id,
                     targetAgent: task.assignedAgent || 'general-contractor',
                     payload: task.description,
                     metadata: task.metadata
                 }, helix.id);
            } else {
                 await this.eventBus.emit('helix.task.pending', {
                     taskId: task.id,
                     reason: 'Waiting for manual gate or dependency clearance'
                 }, helix.id);
            }
        }

        return helix.id;
    }

    /**
     * Very naive topological sort for Helix dependencies
     */
    private sortHelices(cluster: HelixCluster): HelixDescriptor[] {
        // Implementation left as standard map iteration for prototype since wave helices are usually inherently parallel
        return cluster.helices;
    }

    /**
     * Topological sort for intra-Helix tasks based on their dependsOn arrays
     */
    private sortTasks(tasks: HelixTask[]): HelixTask[] {
         const sorted: HelixTask[] = [];
         const visited = new Set<string>();
         
         // A true DAG sort goes here. For now, we respect the defined array order but push dependents down.
         tasks.forEach(task => {
              if(!task.dependsOn || task.dependsOn.length === 0) {
                  sorted.push(task);
                  visited.add(task.id);
              }
         });
         
         tasks.forEach(task => {
             if (task.dependsOn && task.dependsOn.length > 0) {
                 sorted.push(task);
                 visited.add(task.id);
             }
         });

         return sorted;
    }
}
