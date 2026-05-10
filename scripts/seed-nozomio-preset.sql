INSERT INTO hackathon_presets (slug, name, description, is_default, sort_order, tracks)
VALUES (
  'nozomio-2026-may',
  'Nozomio Hackathon (9th May)',
  'Nozomio''s May 9th hackathon — 4 tracks judged on agentic depth, production readiness, growth, and cross-source synthesis.',
  TRUE,
  0,
  $json$
  [
    {
      "id": "always-on-agents",
      "name": "Always-On Agents",
      "tagline": "Background + stateful",
      "description": "Build an agent that runs continuously in the background, remembers what it has learned across sessions, and acts without a human prompting it.",
      "sponsors": ["Nia", "Tensorlake"],
      "emphasis": ["autonomy", "background execution", "memory", "agentic depth"],
      "criteria": [
        {
          "id": "background-execution",
          "title": "Genuine Background Execution",
          "description": "Runs on a schedule / event without user involvement. Top score: deeply autonomous; multi-source triggers, graceful recovery, runs reliably over hours.",
          "weight": 0.30,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "statefulness",
          "title": "Statefulness",
          "description": "Durable memory that improves behaviour across runs. Top score: memory is load-bearing — removing it would break the demo entirely.",
          "weight": 0.25,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "agentic-depth",
          "title": "Agentic Depth",
          "description": "Plans, retries, recovers, and improves autonomously. Top score: full agentic loop — plans, executes, reflects, recovers.",
          "weight": 0.25,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "demo-presentation",
          "title": "Demo & Presentation",
          "description": "Story + live demo make the case unforgettably.",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "judge-personal-rating",
          "title": "Judge's Personal Rating",
          "description": "Does this genuinely excite the judge? Would they want to see it succeed?",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        }
      ]
    },
    {
      "id": "ship-it-full-stack-agents",
      "name": "Ship It — Full-Stack Agents",
      "tagline": "Production-deployed",
      "description": "Build a complete, production-deployed agentic application with real auth, a live backend, and AI logic that holds up off the happy path.",
      "sponsors": ["Nia", "InsForge", "Hyperspell"],
      "emphasis": ["production readiness", "reliability", "full-stack", "deployment"],
      "criteria": [
        {
          "id": "production-readiness",
          "title": "Production Readiness",
          "description": "Live URL, auth, and database all working. Top score: could be handed to a real user today.",
          "weight": 0.35,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "agent-reliability",
          "title": "Agent Reliability",
          "description": "Agent holds up under adversarial or unexpected input — feels production-grade.",
          "weight": 0.30,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "full-stack-depth",
          "title": "Full-Stack Depth",
          "description": "Frontend, backend, and AI logic all integrated and load-bearing — not just a thin wrapper.",
          "weight": 0.25,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "demo-presentation",
          "title": "Demo & Presentation",
          "description": "Live demo lands; story + demo make the case unforgettably.",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "judge-personal-rating",
          "title": "Judge's Personal Rating",
          "description": "Does this genuinely excite the judge? Would they want to see it succeed?",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        }
      ]
    },
    {
      "id": "ai-native-growth-tools",
      "name": "AI-Native Growth Tools",
      "tagline": "Revenue work autonomously",
      "description": "Build tools that do revenue work autonomously — creator scouting, outreach, campaign building, or attribution analysis. The agent should do the work, not just report on it.",
      "sponsors": ["Nia", "Reacher"],
      "emphasis": ["social intelligence", "agentic complexity", "end-to-end automation"],
      "criteria": [
        {
          "id": "social-intelligence-depth",
          "title": "Depth of Social Intelligence Usage",
          "description": "Reacher's Social Intelligence is central to how the agent reasons across sources. Top score: couldn't exist without Reacher.",
          "weight": 0.30,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "agentic-complexity",
          "title": "Agentic Complexity",
          "description": "Plans, retries, and adapts; full agentic loop with autonomous decision-making across the whole flow.",
          "weight": 0.30,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "end-to-end-flow",
          "title": "End-to-End Flow",
          "description": "Discovery → output; sandboxed writes demonstrate real capability. Agent ships a complete campaign autonomously.",
          "weight": 0.20,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "demo-presentation",
          "title": "Demo & Presentation",
          "description": "Live demo lands; story + demo make the case unforgettably.",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "judge-personal-rating",
          "title": "Judge's Personal Rating",
          "description": "Does this genuinely excite the judge? Would they want to see it succeed?",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        }
      ]
    },
    {
      "id": "the-company-brain",
      "name": "The Company Brain",
      "tagline": "Cross-source synthesis",
      "description": "Build an agent that synthesizes context across a company's data and does something genuinely valuable with it — not just answers questions, but does work.",
      "sponsors": ["Nia", "Hyperspell"],
      "emphasis": ["synthesis", "cross-source", "real work", "Hyperspell"],
      "criteria": [
        {
          "id": "cross-source-synthesis",
          "title": "Cross-Source Synthesis",
          "description": "Combines 3+ sources to produce coherent context. Top score: produces context no single source could; the brain is the product.",
          "weight": 0.30,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "real-work-not-just-answers",
          "title": "Real Work, Not Just Answers",
          "description": "Agent ships work a human would actually use — replaces hours of human work, not a Q&A bot.",
          "weight": 0.25,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "hyperspell-integration-depth",
          "title": "Hyperspell Integration Depth",
          "description": "Synthesis through Hyperspell is core to how the agent works — removing it would break the demo entirely.",
          "weight": 0.25,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "demo-presentation",
          "title": "Demo & Presentation",
          "description": "Live demo lands; story + demo make the case unforgettably.",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        },
        {
          "id": "judge-personal-rating",
          "title": "Judge's Personal Rating",
          "description": "Does this genuinely excite the judge? Would they want to see it succeed?",
          "weight": 0.10,
          "scale": { "kind": "5-point", "min": 1, "max": 5, "step": 1 }
        }
      ]
    }
  ]
  $json$::jsonb
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    tracks = EXCLUDED.tracks,
    is_default = EXCLUDED.is_default,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
