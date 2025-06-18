'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, Building2, BarChart3, PieChart, Search, FileText } from 'lucide-react';
import { cn } from '~/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompts: string[];
}

const categories: Category[] = [
  {
    id: 'deal-sourcing',
    name: 'Deal Sourcing & Due Diligence',
    icon: <Search className="w-4 h-4" />,
    prompts: [
      "What are the most active PE firms investing in B2B SaaS companies with $10-50M ARR?",
      "Show me recent tuck-in acquisitions in the healthcare IT sector with disclosed multiples",
      "Which strategic buyers have been most acquisitive in fintech over the past 18 months?",
      "Analyze the competitive landscape for payment processing companies in Southeast Asia",
    ],
  },
  {
    id: 'portfolio-analysis',
    name: 'Portfolio Company Analysis',
    icon: <Building2 className="w-4 h-4" />,
    prompts: [
      "Compare revenue growth rates across our portfolio companies in the last 4 quarters",
      "What operational KPIs should we track for a D2C e-commerce portfolio company?",
      "Benchmark our SaaS portfolio's burn multiples against industry standards",
      "Identify cross-selling opportunities between our healthcare portfolio companies",
    ],
  },
  {
    id: 'market-comparables',
    name: 'Market Comparables & Valuations',
    icon: <BarChart3 className="w-4 h-4" />,
    prompts: [
      "What are current EV/Revenue multiples for public cybersecurity companies?",
      "Show me comparable transactions for a $200M logistics software company",
      "How have SaaS valuation multiples trended since Q1 2023?",
      "Compare EBITDA margins across different software verticals",
    ],
  },
  {
    id: 'fund-performance',
    name: 'Fund Performance & LP Reporting',
    icon: <PieChart className="w-4 h-4" />,
    prompts: [
      "Calculate our fund's gross and net IRR including recent portfolio marks",
      "Generate a quarterly LP update highlighting key portfolio developments",
      "What's the DPI and TVPI for vintage 2019 buyout funds?",
      "Analyze our fund's performance against Cambridge Associates benchmarks",
    ],
  },
  {
    id: 'sector-research',
    name: 'Sector-Specific Research',
    icon: <TrendingUp className="w-4 h-4" />,
    prompts: [
      "What are the key growth drivers in the renewable energy sector for 2025?",
      "Analyze consolidation trends in the fragmented HVAC services industry",
      "Which vertical SaaS categories have the highest retention rates?",
      "Map the competitive dynamics in the alternative protein market",
    ],
  },
  {
    id: 'regulatory-compliance',
    name: 'Regulatory & Compliance',
    icon: <FileText className="w-4 h-4" />,
    prompts: [
      "Summarize recent SEC guidance on AI washing in fund marketing",
      "What are the key considerations for CFIUS filing on our tech acquisition?",
      "How do carried interest tax proposals affect our fund structure?",
      "Review best practices for ESG reporting in private equity",
    ],
  },
];

interface FinanceConversationStarterProps {
  className?: string;
  onSend?: (message: string) => void;
  isCentered?: boolean;
}

export function FinanceConversationStarter({
  className,
  onSend,
  isCentered = false,
}: FinanceConversationStarterProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className={cn(
          "mb-4",
          isCentered ? "text-center" : ""
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          What would you like to explore?
        </h3>
      </motion.div>

      <div className={cn(
        "grid gap-2",
        isCentered ? "grid-cols-2 max-w-2xl mx-auto" : "grid-cols-3"
      )}>
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05 + 0.2,
            }}
          >
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg",
                "bg-card border border-border text-card-foreground",
                "hover:bg-accent hover:border-accent-foreground/20",
                "transition-all duration-200",
                "text-sm font-medium text-left",
                expandedCategory === category.id && "bg-accent border-accent-foreground/20"
              )}
            >
              <div className="flex items-center gap-2">
                {category.icon}
                <span>{category.name}</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  expandedCategory === category.id && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {expandedCategory === category.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-1">
                    {category.prompts.map((prompt, promptIndex) => (
                      <motion.button
                        key={promptIndex}
                        onClick={() => onSend?.(prompt)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-lg",
                          "bg-background/50 border border-border/50",
                          "hover:bg-accent/50 hover:border-accent-foreground/20",
                          "transition-all duration-200",
                          "text-sm text-muted-foreground hover:text-foreground"
                        )}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: promptIndex * 0.05,
                        }}
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}