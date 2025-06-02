// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import type { SettingsState } from "~/core/store";

import type { Tab } from "./types";

const generalFormSchema = z.object({
  autoAcceptedPlan: z.boolean(),
  enableBackgroundInvestigation: z.boolean(),
  maxPlanIterations: z.number().min(1, {
    message: "Max plan iterations must be at least 1.",
  }),
  maxStepNum: z.number().min(1, {
    message: "Max step number must be at least 1.",
  }),
});

export const GeneralTab: Tab = ({
  settings,
  onChange,
}: {
  settings: SettingsState;
  onChange: (changes: Partial<SettingsState>) => void;
}) => {
  const generalSettings = React.useMemo(() => settings.general, [settings]);
  const form = useForm<z.infer<typeof generalFormSchema>>({
    resolver: zodResolver(generalFormSchema, undefined, undefined),
    defaultValues: {
      autoAcceptedPlan: generalSettings.autoAcceptedPlan ?? false,
      enableBackgroundInvestigation:
        generalSettings.enableBackgroundInvestigation ?? false,
      maxPlanIterations: generalSettings.maxPlanIterations ?? 1, // Ensure default for number
      maxStepNum: generalSettings.maxStepNum ?? 1, // Ensure default for number
    },
    mode: "all",
    reValidateMode: "onBlur",
  });

  const currentSettings: Partial<z.infer<typeof generalFormSchema>> = form.watch();
  React.useEffect(() => {
    let hasChanges = false;

    // Construct the object that precisely matches SettingsState['general']
    const newGeneralSettings: SettingsState['general'] = {
      autoAcceptedPlan: currentSettings.autoAcceptedPlan ?? false,
      enableBackgroundInvestigation: currentSettings.enableBackgroundInvestigation ?? false,
      maxPlanIterations: currentSettings.maxPlanIterations ?? 1,
      maxStepNum: currentSettings.maxStepNum ?? 1,
    };

    for (const key in newGeneralSettings) {
      if (
        newGeneralSettings[key as keyof typeof newGeneralSettings] !==
        settings.general[key as keyof SettingsState["general"]]
      ) {
        hasChanges = true;
        break;
      }
    }
    if (hasChanges) {
      onChange({ general: newGeneralSettings });
    }
  }, [currentSettings, onChange, settings]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-medium">General</h1>
      </header>
      <main>
        <Form {...form}>
          <form className="space-y-8">
            <FormField
              control={form.control}
              name="autoAcceptedPlan"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="autoAcceptedPlan"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label className="text-sm" htmlFor="autoAcceptedPlan">
                        Allow automatic acceptance of plans
                      </Label>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxPlanIterations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max plan iterations</FormLabel>
                  <FormControl>
                    <Input
                      className="w-60"
                      type="number"
                      defaultValue={field.value}
                      min={1}
                      onChange={(event) =>
                        field.onChange(parseInt(event.target.value || "0"))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Set to 1 for single-step planning. Set to 2 or more to
                    enable re-planning.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxStepNum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max steps of a research plan</FormLabel>
                  <FormControl>
                    <Input
                      className="w-60"
                      type="number"
                      defaultValue={field.value}
                      min={1}
                      onChange={(event) =>
                        field.onChange(parseInt(event.target.value || "0"))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    By default, each research plan has 3 steps.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </main>
    </div>
  );
};
GeneralTab.displayName = "General";
GeneralTab.icon = Settings;
