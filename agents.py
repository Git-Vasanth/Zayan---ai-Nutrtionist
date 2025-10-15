from typing import TypedDict, Annotated, Dict, Any, List, Literal
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END , START
from IPython.display import Image, display
from sqlalchemy.orm import Session
import os 
from DB import PlanApproval

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o-mini",
    # stream_usage=True,
    # temperature=None,
    max_tokens = 500)

class AgentState(TypedDict):
    messages: Annotated[List[Any], add_messages]
    diet_type: str
    user_data: Dict[str, Any]
    data_level: int
    plan_generated: bool
    nutrition_feedback: str
    needs_revision: bool  
          
def Mediterranean_Nutrition_Agent(state: AgentState) -> AgentState:
    """Simple Mediterranean Agent - Just 8 Questions in Order"""
    
    user_data = state.get("user_data", {})
    data_level = state.get("data_level", 1)
    messages = state.get("messages", [])
    
    print(f"🔍 Level {data_level}/8")
    
    user_name = user_data.get('name', 'User')
    
    # ✅ SIMPLE: Pre-defined questions for each level
    questions = {
        1: f"What time do you usually have your meals, and do you follow a consistent schedule during weekdays versus weekends?",
        2: f"How often do you snack between meals, and what types of snacks do you normally enjoy?",
        3: f"Do you often crave specific types of foods like spicy, sweet, or salty items?",
        4: f"How comfortable are you with cooking at home, and do you usually prepare meals yourself?",
        5: f"How much time can you realistically dedicate to grocery shopping and meal prep each week?",
        6: f"What does your typical daily schedule look like (work hours, sleep, etc.)?",
        7: f"Have you tried any diets before? What worked or didn't work for you?",
        8: f"What motivates you to follow this diet, and do you have support from others?"
    }
    
    # ✅ SIMPLE: After level 8, show summary
    if data_level > 8:
        summary = f"Based on our conversation, I understand your routine, preferences, and goals. Does this summary look correct?"
        state["messages"].append(AIMessage(content=summary))
        state["data_collection_complete"] = True
        return state
    
    # ✅ SIMPLE: Just ask the pre-defined question
    question = questions[data_level]
    state["messages"].append(AIMessage(content=question))
    
    # ✅ SIMPLE: Advance to next level immediately
    state["data_level"] = data_level + 1
    
    return state
  
workflow = StateGraph(AgentState)

workflow.add_node("mediterranean_agent", Mediterranean_Nutrition_Agent)
workflow.add_edge(START, "mediterranean_agent")
workflow.add_edge("mediterranean_agent", END)

# Compile the graph
workflow_app  = workflow.compile()


