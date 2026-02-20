#!/usr/bin/env python3
"""
Inception CLI - Command-line interface for Inception Engine V4

Provides mode-based commands for the four operational modes:
- inception ideate
- inception plan
- inception ship
- inception validate
"""

import click
import json
import sys
from pathlib import Path
from typing import Optional
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.orchestrator import InceptionOrchestrator, ModeType
from core.orchestrator import ConstitutionalViolationError, GateFailureError

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@click.group()
@click.version_option(version='4.0.0')
def cli():
    """🧬 Inception Engine V4 - Four-Mode AI Development System"""
    pass


@cli.command()
@click.argument('prompt')
@click.option('--output', '-o', type=click.Path(), help='Output file for vision document')
@click.option('--agents', '-a', help='Comma-separated list of specific agents to activate')
def ideate(prompt: str, output: Optional[str], agents: Optional[str]):
    """
    🌟 IDEATE mode - Strategic vision and alignment
    
    All agents participate in brainstorming and vision creation.
    
    Example:
        inception ideate "Build a live streaming platform for artists"
    """
    click.echo("\n🌟 IDEATE MODE - All Hands on Deck\n")
    
    try:
        orchestrator = InceptionOrchestrator()
        
        result = orchestrator.execute_mode(
            ModeType.IDEATE,
            {"prompt": prompt}
        )
        
        click.echo(f"✓ Vision created with {result['agent_count']} agents")
        click.echo(f"✓ Session ID: {result['session_id']}")
        
        if output:
            with open(output, 'w') as f:
                json.dump(result, f, indent=2)
            click.echo(f"✓ Vision document saved to: {output}")
        
        click.echo("\n📄 Vision Summary:")
        click.echo(json.dumps(result['vision_document'], indent=2))
        
        click.echo("\n💡 Next step: inception plan --from-last")
        
    except Exception as e:
        click.echo(f"\n❌ IDEATE failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('prompt', required=False)
@click.option('--from-ideation', type=str, help='Session ID from ideation')
@click.option('--from-last', is_flag=True, help='Use output from last session')
@click.option('--output', '-o', type=click.Path(), help='Output file for technical spec')
def plan(prompt: Optional[str], from_ideation: Optional[str], from_last: bool, output: Optional[str]):
    """
    📋 PLAN mode - Technical specification and task breakdown
    
    Focused team creates detailed architecture and implementation plan.
    
    Examples:
        inception plan --from-last
        inception plan "E-commerce platform with payment integration"
    """
    click.echo("\n📋 PLAN MODE - Focused Execution Prep\n")
    
    try:
        orchestrator = InceptionOrchestrator()
        
        # Determine input
        input_data = {}
        if from_last:
            last_session = orchestrator.mode_manager.get_last_session(ModeType.IDEATE)
            if last_session and last_session.output_data:
                input_data = last_session.output_data
            else:
                click.echo("❌ No previous IDEATE session found", err=True)
                sys.exit(1)
        elif from_ideation:
            # Load from session ID
            input_data = {"session_id": from_ideation}
        elif prompt:
            input_data = {"prompt": prompt, "direct_prompt": True}
        else:
            click.echo("❌ Must provide prompt, --from-last, or --from-ideation", err=True)
            sys.exit(1)
        
        result = orchestrator.execute_mode(
            ModeType.PLAN,
            input_data
        )
        
        click.echo(f"✓ Technical specification created")
        click.echo(f"✓ Session ID: {result['session_id']}")
        
        if output:
            with open(output, 'w') as f:
                json.dump(result, f, indent=2)
            click.echo(f"✓ Technical spec saved to: {output}")
        
        click.echo("\n📋 Specification Summary:")
        click.echo(json.dumps(result['technical_specification'], indent=2))
        
        click.echo("\n💡 Next step: inception ship --from-last")
        
    except Exception as e:
        click.echo(f"\n❌ PLAN failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('prompt', required=False)
@click.option('--from-plan', type=str, help='Session ID from planning')
@click.option('--from-last', is_flag=True, help='Use output from last session')
@click.option('--mode', type=click.Choice(['fast', 'balanced', 'careful']), default='balanced', help='Speed mode')
@click.option('--validate', is_flag=True, help='Auto-run validation after ship')
def ship(prompt: Optional[str], from_plan: Optional[str], from_last: bool, mode: str, validate: bool):
    """
    🚀 SHIP mode - Implementation through production deployment
    
    Cannot exit until application is LIVE and accessible.
    
    Examples:
        inception ship --from-last
        inception ship "Todo app with auth" --validate
        inception ship --from-last --mode=fast
    """
    click.echo("\n🚀 SHIP MODE - Zero Day GTM\n")
    click.echo(f"Speed mode: {mode.upper()}\n")
    
    try:
        orchestrator = InceptionOrchestrator()
        
        # Determine input
        input_data = {"speed_mode": mode}
        if from_last:
            last_session = orchestrator.mode_manager.get_last_session(ModeType.PLAN)
            if not last_session:
                last_session = orchestrator.mode_manager.get_last_session(ModeType.IDEATE)
            if last_session and last_session.output_data:
                input_data.update(last_session.output_data)
            else:
                click.echo("❌ No previous session found", err=True)
                sys.exit(1)
        elif from_plan:
            input_data["session_id"] = from_plan
        elif prompt:
            input_data["prompt"] = prompt
            input_data["direct_prompt"] = True
        else:
            click.echo("❌ Must provide prompt, --from-last, or --from-plan", err=True)
            sys.exit(1)
        
        click.echo("⚡ Starting implementation...\n")
        
        result = orchestrator.execute_mode(
            ModeType.SHIP,
            input_data
        )
        
        click.echo("\n" + "="*60)
        click.echo("🎉 SHIPPED!")
        click.echo("="*60)
        click.echo(f"\n✓ Production URL: {result['production_url']}")
        click.echo(f"✓ Documentation: {result['documentation_url']}")
        click.echo(f"✓ Monitoring: {result['monitoring_url']}")
        click.echo(f"✓ Health Check: {result['health_check_url']}")
        click.echo(f"\n✓ Session ID: {result['session_id']}")
        click.echo(f"✓ Deployed: {result['deployment_time']}")
        
        if validate:
            click.echo("\n🔍 Running validation...\n")
            validation_result = orchestrator.execute_mode(
                ModeType.VALIDATE,
                {"build_output": result}
            )
            
            if validation_result['validation_passed']:
                click.echo("✅ Validation PASSED")
            else:
                click.echo("⚠️  Validation found issues")
                click.echo(json.dumps(validation_result['required_fixes'], indent=2))
        else:
            click.echo("\n💡 Next step: inception validate --from-last")
        
    except GateFailureError as e:
        click.echo(f"\n❌ SHIP gates failed: {e}", err=True)
        click.echo("\n⚠️  Cannot exit SHIP mode - production readiness not achieved")
        sys.exit(1)
    except ConstitutionalViolationError as e:
        click.echo(f"\n❌ Constitutional violation: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n❌ SHIP failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('build_id', required=False)
@click.option('--from-ship', type=str, help='Session ID from ship')
@click.option('--from-last', is_flag=True, help='Use output from last SHIP session')
@click.option('--output', '-o', type=click.Path(), help='Output file for validation report')
def validate(build_id: Optional[str], from_ship: Optional[str], from_last: bool, output: Optional[str]):
    """
    🔍 VALIDATE mode - Independent quality assurance
    
    Fresh eyes review for security, architecture, logic, and constitutional compliance.
    
    Examples:
        inception validate --from-last
        inception validate BUILD_ID
    """
    click.echo("\n🔍 VALIDATE MODE - Fresh Eyes Quality Assurance\n")
    
    try:
        orchestrator = InceptionOrchestrator()
        
        # Determine input
        input_data = {}
        if from_last or build_id:
            last_session = orchestrator.mode_manager.get_last_session(ModeType.SHIP)
            if last_session and last_session.output_data:
                input_data = {"build_output": last_session.output_data}
            else:
                click.echo("❌ No previous SHIP session found", err=True)
                sys.exit(1)
        elif from_ship:
            input_data = {"session_id": from_ship}
        else:
            click.echo("❌ Must provide build_id, --from-last, or --from-ship", err=True)
            sys.exit(1)
        
        result = orchestrator.execute_mode(
            ModeType.VALIDATE,
            input_data
        )
        
        click.echo("\n" + "="*60)
        if result['validation_passed']:
            click.echo("✅ VALIDATION PASSED")
        else:
            click.echo("⚠️  VALIDATION FOUND ISSUES")
        click.echo("="*60 + "\n")
        
        # Show results
        results = result['results']
        click.echo("🛡️  Security Scan: " + ("✓" if results['security_scan']['passed'] else "✗"))
        click.echo(f"🏗️  Architecture: {results['architecture_review']['score']}/100")
        click.echo("🧠 Logic Validation: " + ("✓" if results['logic_validation']['passed'] else "✗"))
        click.echo(f"✅ Test Coverage: {results['test_coverage']['percentage']}%")
        click.echo("⚖️  Constitutional: " + ("✓" if results['constitutional_compliance']['passed'] else "✗"))
        
        if not result['validation_passed']:
            click.echo("\n⚠️  Required Fixes:")
            for fix in result['required_fixes']:
                click.echo(f"  - {fix}")
        
        if output:
            with open(output, 'w') as f:
                json.dump(result, f, indent=2)
            click.echo(f"\n✓ Validation report saved to: {output}")
        
        click.echo(f"\n✓ Session ID: {result['session_id']}")
        
    except Exception as e:
        click.echo(f"\n❌ VALIDATE failed: {e}", err=True)
        sys.exit(1)


@cli.command()
def status():
    """📊 Show system status and active sessions"""
    try:
        orchestrator = InceptionOrchestrator()
        status = orchestrator.get_status()
        
        click.echo("\n📊 Inception Engine V4 Status\n")
        click.echo("="*60)
        
        if status['current_session']:
            session = status['current_session']
            click.echo(f"\n🔄 Active Session:")
            click.echo(f"  Mode: {session['mode']}")
            click.echo(f"  Status: {session['status']}")
            click.echo(f"  Session ID: {session['session_id']}")
        else:
            click.echo("\n✓ No active session")
        
        click.echo(f"\n🤖 Agents:")
        click.echo(f"  Active: {status['active_agents']}")
        
        click.echo(f"\n📜 History:")
        click.echo(f"  Total workflows: {status['workflow_history_count']}")
        
        agent_summary = status.get('agent_loader', {})
        if agent_summary:
            click.echo(f"\n🧬 Agent Registry:")
            click.echo(f"  Total: {agent_summary.get('total_agents', 0)}")
            click.echo(f"  Builders: {agent_summary.get('builders', 0)}")
            click.echo(f"  Validators: {agent_summary.get('validators', 0)}")
        
        click.echo("\n" + "="*60)
        
    except Exception as e:
        click.echo(f"\n❌ Status check failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--mode', type=click.Choice(['ideate', 'plan', 'ship', 'validate', 'all']), default='all')
def history(mode: str):
    """📜 Show workflow execution history"""
    try:
        orchestrator = InceptionOrchestrator()
        
        click.echo(f"\n📜 Workflow History: {mode.upper()}\n")
        click.echo("="*60)
        
        for record in orchestrator.workflow_history:
            if mode == 'all' or record['mode'].lower() == mode:
                click.echo(f"\n{record['mode']} - {record['session_id']}")
                click.echo(f"  Started: {record['start_time']}")
                click.echo(f"  Ended: {record['end_time']}")
                click.echo(f"  Status: {'✓ Success' if record['success'] else '✗ Failed'}")
                if record.get('output_summary'):
                    for key, value in record['output_summary'].items():
                        click.echo(f"  {key}: {value}")
        
        click.echo("\n" + "="*60)
        
    except Exception as e:
        click.echo(f"\n❌ History retrieval failed: {e}", err=True)
        sys.exit(1)


@cli.command()
def agents():
    """🤖 List all available agents"""
    try:
        from core.agent_loader import AgentLoader
        
        loader = AgentLoader()
        
        click.echo("\n🤖 Agent Registry\n")
        click.echo("="*60)
        
        click.echo(f"\n📊 Summary:")
        summary = loader.get_summary()
        click.echo(f"  Total Agents: {summary['total_agents']}")
        click.echo(f"  Builders: {summary['builders']}")
        click.echo(f"  Validators: {summary['validators']}")
        
        click.echo(f"\n🏢 By Hive:")
        for hive, count in summary['by_hive'].items():
            if count > 0:
                click.echo(f"  {hive}: {count} agents")
        
        click.echo(f"\n🔨 Builder Agents:")
        for agent in loader.get_builder_agents()[:10]:  # Show first 10
            click.echo(f"  - {agent.name} ({agent.hive or 'No hive'})")
        
        click.echo(f"\n🔍 Validator Agents:")
        for agent in loader.get_validator_agents():
            click.echo(f"  - {agent.name}")
        
        click.echo("\n" + "="*60)
        
    except Exception as e:
        click.echo(f"\n❌ Agent listing failed: {e}", err=True)
        sys.exit(1)


# Workflow shortcuts

@cli.command()
@click.argument('prompt')
def full(prompt: str):
    """🔄 Execute full lifecycle: IDEATE → PLAN → SHIP → VALIDATE"""
    click.echo("\n🔄 FULL LIFECYCLE WORKFLOW\n")
    click.echo("="*60)
    
    try:
        orchestrator = InceptionOrchestrator()
        result = orchestrator.execute_full_lifecycle(prompt)
        
        click.echo("\n✅ Full lifecycle complete!")
        click.echo(f"\n🌐 Production URL: {result['shipping']['production_url']}")
        click.echo(f"✓ Validation: {'PASSED' if result['validation']['validation_passed'] else 'ISSUES FOUND'}")
        
    except Exception as e:
        click.echo(f"\n❌ Workflow failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('prompt')
def rapid(prompt: str):
    """⚡ Execute rapid workflow: IDEATE → SHIP → VALIDATE"""
    click.echo("\n⚡ RAPID WORKFLOW (Skip Planning)\n")
    click.echo("="*60)
    
    try:
        orchestrator = InceptionOrchestrator()
        result = orchestrator.execute_rapid_workflow(prompt)
        
        click.echo("\n✅ Rapid workflow complete!")
        click.echo(f"\n🌐 Production URL: {result['shipping']['production_url']}")
        click.echo(f"✓ Validation: {'PASSED' if result['validation']['validation_passed'] else 'ISSUES FOUND'}")
        
    except Exception as e:
        click.echo(f"\n❌ Workflow failed: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('prompt')
def express(prompt: str):
    """🚀 Execute express workflow: SHIP → VALIDATE (prompt-to-product)"""
    click.echo("\n🚀 EXPRESS WORKFLOW (Prompt-to-Product)\n")
    click.echo("="*60)
    
    try:
        orchestrator = InceptionOrchestrator()
        result = orchestrator.execute_express_workflow(prompt)
        
        click.echo("\n✅ Express workflow complete!")
        click.echo(f"\n🌐 Production URL: {result['shipping']['production_url']}")
        click.echo(f"✓ Validation: {'PASSED' if result['validation']['validation_passed'] else 'ISSUES FOUND'}")
        
    except Exception as e:
        click.echo(f"\n❌ Workflow failed: {e}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    cli()
