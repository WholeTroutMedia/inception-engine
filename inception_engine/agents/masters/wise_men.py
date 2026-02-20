"""THREE WISE MEN - Advisory Council

Warren Buffett (Financial Wisdom)
Buddhist Monk (Philosophical Grounding)
Sun Tzu (Strategic Thinking)
"""

from typing import Dict, Any, List
from ..base_agent import BaseAgent


class WarrenBuffettAgent(BaseAgent):
    """Financial wisdom and capital efficiency advisor."""
    
    def __init__(self):
        super().__init__(
            name="Warren_Buffett",
            agent_type="advisor",
            hive=None,
            specialization="financial_wisdom",
            active_modes=["ideate", "plan", "ship"]
        )
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Provide financial and business wisdom."""
        return {
            "status": "success",
            "agent": self.name,
            "advice": {
                "principle": "Invest in what you understand, build for the long term",
                "financial_wisdom": [
                    "Focus on sustainable unit economics",
                    "Avoid unnecessary complexity and costs",
                    "Build competitive moats through quality",
                    "Think in decades, not quarters"
                ],
                "business_insight": "Value comes from solving real problems better than anyone else",
                "risk_assessment": "Conservative approach to preserve capital, aggressive on opportunity"
            }
        }
    
    def get_capabilities(self) -> List[str]:
        return ["Financial strategy", "Business model evaluation", "Long-term thinking", "Risk management"]


class BuddhaAgent(BaseAgent):
    """Philosophical grounding and compassion advisor."""
    
    def __init__(self):
        super().__init__(
            name="Buddha",
            agent_type="advisor",
            hive=None,
            specialization="philosophy_compassion",
            active_modes=["ideate", "plan", "ship"]
        )
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Provide philosophical guidance and wisdom."""
        return {
            "status": "success",
            "agent": self.name,
            "advice": {
                "principle": "Right action comes from right understanding",
                "wisdom": [
                    "Build with intention and mindfulness",
                    "Consider impact on all stakeholders",
                    "Simplicity reveals truth",
                    "Sustainable systems honor balance"
                ],
                "ethical_guidance": "Create value without causing harm",
                "user_focus": "True success is measured by positive impact on lives"
            }
        }
    
    def get_capabilities(self) -> List[str]:
        return ["Ethical guidance", "User empathy", "Simplicity", "Long-term sustainability"]


class SunTzuAgent(BaseAgent):
    """Strategic thinking and competitive advantage advisor."""
    
    def __init__(self):
        super().__init__(
            name="Sun_Tzu",
            agent_type="advisor",
            hive=None,
            specialization="strategy_competition",
            active_modes=["ideate", "plan", "ship"]
        )
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Provide strategic and competitive wisdom."""
        return {
            "status": "success",
            "agent": self.name,
            "advice": {
                "principle": "Victory comes from knowing yourself and your terrain",
                "strategic_wisdom": [
                    "Choose battles where you have advantage",
                    "Speed and decisiveness win markets",
                    "Adapt strategy to changing conditions",
                    "Build from position of strength"
                ],
                "competitive_insight": "Differentiation is defense, excellence is offense",
                "execution": "Perfect execution beats perfect planning"
            }
        }
    
    def get_capabilities(self) -> List[str]:
        return ["Strategic planning", "Competitive analysis", "Tactical execution", "Adaptation"]
