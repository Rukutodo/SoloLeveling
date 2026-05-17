import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

# LABELS
labels = {
    0: "Core API Routes & Models",
    1: "Architectural Mapping & Features",
    2: "Authentication & User Management",
    3: "Quests & Physical Metrics",
    4: "Mongoose Models & Schemas",
    5: "AI Logging & Gmail Integration",
    6: "Frontend Pages & UI Components",
    7: "Project Metadata & Tech Stack",
    8: "Theming & Styling System",
    9: "Notes Management",
    10: "Auth Configuration & Monitoring",
    11: "Sidebar & Navigation UI",
    12: "Admin Logs Dashboard",
    13: "Investment Management",
    14: "Birthday Tracking",
    15: "Calorie Tracker & Date Selection",
    16: "Notes API Endpoints",
    17: "Middleware & Auth Guards",
    18: "Logbook & Daily Logs",
    19: "Root Layout & Session",
    20: "Todo Management API",
    21: "Financial Statements & Records",
    22: "Workout Management UI",
    23: "Insurance Management API",
    24: "Finance Dashboard UI",
    25: "Calendar Dashboard UI",
    26: "User Dashboard UI",
    27: "AI & GenAI Integrations",
    28: "Logbook Data Flow",
    29: "Shared Library Utilities",
    30: "AI Advisor API",
    31: "Sleep Analysis AI",
    32: "Calorie Analysis AI",
    33: "BMI Tracker UI",
    34: "Logbook UI",
    35: "Todo List UI",
    36: "Notes List UI",
    37: "Core Systems (BMI/Calories/XP)"
}
# Fill in the rest
for cid in communities:
    if cid not in labels:
        labels[cid] = f"Community {cid}"

# Regenerate questions with real community labels
questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}), encoding='utf-8')
print('Report updated with community labels')
