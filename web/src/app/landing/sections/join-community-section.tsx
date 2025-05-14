// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { GithubFilled } from "@ant-design/icons";
import Link from "next/link";

import { AuroraText } from "~/components/magicui/aurora-text";
import { Button } from "~/components/ui/button";

import { SectionHeader } from "../components/section-header";

export function JoinCommunitySection() {
  return (
    <section className="flex w-full flex-col items-center justify-center pb-12">
      <SectionHeader
        anchor="join-community"
        title={
          <AuroraText colors={["#60A5FA", "#A5FA60", "#A560FA"]}>
            Join the Omega Platform
          </AuroraText>
        }
        description="Spend more time analyzing deals and less time crunching data."
      />
      <Button className="text-xl" size="lg" asChild>
        <Link href="https://www.omegaintelligence.ai/" target="_blank">
          <GithubFilled />
          Try Now
        </Link>
      </Button>
    </section>
  );
}
