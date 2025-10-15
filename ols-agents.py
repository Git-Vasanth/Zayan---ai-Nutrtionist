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

llm = ChatOpenAI(model="gpt-4o-mini", max_tokens=200)

class AgentState(TypedDict):
    messages: Annotated[List[Any], add_messages]
    diet_type: str
    user_data: Dict[str, Any]
    data_level: int
    plan_generated: bool
    nutrition_feedback: str
    needs_revision: bool  

def route_based_on_diet(state: AgentState) -> str:  # Must return STRING, not dict!
    diet_type = state.get("diet_type", "mediterranean").lower()
    
    agent_mapper = {
        "mediterranean": "mediterranean_agent",
        "keto": "keto_agent",
        "vegan": "vegan_agent", 
        "paleo": "paleo_agent",
        "intermittent fasting": "fasting_agent"
    }
    
    # ✅ MUST return a STRING (node name), not call the function
    return agent_mapper.get(diet_type, "mediterranean_agent")
          
def Mediterranean_Nutrition_Agent(state: AgentState) -> AgentState:
    """Clean Mediterranean Diet Agent - No Errors"""
    
    # Get data from state
    user_data = state.get("user_data", {})
    data_level = state.get("data_level", 1)
    messages = state.get("messages", [])
    
    # Convert all messages to simple dictionaries for consistent handling
    simple_messages = []
    for msg in messages:
        if isinstance(msg, dict):
            simple_messages.append(msg)
        else:
            # Convert LangChain objects to dictionaries
            role = "user" if hasattr(msg, 'type') and msg.type == 'human' else "assistant"
            content = msg.content if hasattr(msg, 'content') else str(msg)
            simple_messages.append({"role": role, "content": content})
    
    # Update state with clean messages
    state["messages"] = simple_messages
    
    # Get the last user message
    last_user_msg = None
    for msg in reversed(simple_messages):
        if msg["role"] == "user":
            last_user_msg = msg["content"]
            break
    
    # System prompt
    system_prompt = f"""You are a Mediterranean Diet Specialist collecting information.

User: {user_data.get('name', 'User')}
Goal: {user_data.get('main_goal', 'General health')}
Data Level: {data_level}/4

Ask questions to understand their eating habits and preferences.
When you have enough information, say "I have all the information needed"."""
    
    # Build messages for LLM
    llm_messages = [SystemMessage(content=system_prompt)]
    
    # Add conversation history
    for msg in simple_messages[-6:]:  # Last 6 messages
        if msg["role"] == "user":
            llm_messages.append(HumanMessage(content=msg["content"]))
        else:
            llm_messages.append(AIMessage(content=msg["content"]))
    
    # Get AI response
    response = llm.invoke(llm_messages)
    ai_response = response.content
    
    # Add to state
    state["messages"].append({"role": "assistant", "content": ai_response})
    
    # Update data level
    user_msg_count = len([m for m in simple_messages if m["role"] == "user"])
    if user_msg_count >= 6:
        state["data_level"] = 4
    elif user_msg_count >= 4:
        state["data_level"] = 3
    elif user_msg_count >= 2:
        state["data_level"] = 2
    
    # Auto-completion detection
    if "all the information needed" in ai_response.lower():
        state["data_level"] = 4
    
    return state

def Mediterranean_Nutrition_plan_generator_Agent(state: AgentState) -> AgentState:
    """Clean Mediterranean Plan Generator - No Errors"""
    
    user_data = state.get("user_data", {})
    
    plan_prompt = f"""Create a {user_data.get('diet_duration_days', 7)}-day Mediterranean diet plan.

USER: {user_data.get('name', 'User')}
GOAL: {user_data.get('main_goal', 'General health')}
ALLERGIES: {user_data.get('allergies', 'None')}
HEALTH CONDITIONS: {user_data.get('diseases', 'None')}

Create a detailed plan with:
- Daily meal structure
- Specific food items
- Serving sizes
- Simple preparation tips"""

    # Generate plan
    plan_response = llm.invoke([
        SystemMessage(content="Create practical Mediterranean diet plans."),
        HumanMessage(content=plan_prompt)
    ])

    # Store in state
    state["generated_plan"] = plan_response.content
    state["plan_generated"] = True
    
    # Add user message
    state["messages"].append({
        "role": "assistant", 
        "content": "✅ Your Mediterranean diet plan has been created and sent for nutritionist approval!"
    })
    
    return state


workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("router", route_based_on_diet)  # This should be a function that returns next node name
workflow.add_node("mediterranean_agent", Mediterranean_Nutrition_Agent)
workflow.add_node("mediterranean_plan_gen", Mediterranean_Nutrition_plan_generator_Agent)

# Set entry point
workflow.set_entry_point("router")

# Add conditional routing FROM router TO diet agents
workflow.add_conditional_edges(
    "router",
    route_based_on_diet,  # This returns node names as strings
    {
        "mediterranean_agent": "mediterranean_agent",
        "keto_agent": "keto_agent",
        "vegan_agent": "vegan_agent",
        "paleo_agent": "paleo_agent",
        "fasting_agent": "fasting_agent"
    }
)

# Connect diet agents to their plan generators
workflow.add_edge("mediterranean_agent", "mediterranean_plan_gen")


# Connect all plan generators to human feedback
workflow.add_edge("mediterranean_plan_gen" , END)

def check_feedback_approval(state: AgentState) -> Literal["formatter", "mediterranean_plan_gen", "keto_plan_gen", "vegan_plan_gen", "paleo_plan_gen", "fasting_plan_gen"]:
    
    feedback = state.get("nutrition_feedback", "").lower()
    
    if "approve" in feedback or "ok" in feedback or "good" in feedback:
        return "formatter"  # Approved → go to formatter
    else:
        # Rejected → go back to the specific plan generator
        diet_type = state.get("diet_type", "vegan").lower()
        return {
            "mediterranean": "mediterranean_plan_gen",
            "keto": "keto_plan_gen", 
            "vegan": "vegan_plan_gen",
            "paleo": "paleo_plan_gen",
            "intermittent fasting": "fasting_plan_gen"
        }.get(diet_type, "vegan_plan_gen")

# REPLACE the feedback → formatter edge with this conditional edge:
workflow.add_conditional_edges(
    "feedback",
    check_feedback_approval,
    {
        "formatter": "formatter",
        "mediterranean_plan_gen": "mediterranean_plan_gen",
        "keto_plan_gen": "keto_plan_gen",
        "vegan_plan_gen": "vegan_plan_gen",
        "paleo_plan_gen": "paleo_plan_gen",
        "fasting_plan_gen": "fasting_plan_gen"
    }
)

# Connect formatter to end
workflow.add_edge("formatter", END)

# Compile the graph
workflow_app  = workflow.compile()


