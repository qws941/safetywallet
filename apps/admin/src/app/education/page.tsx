"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@safetywallet/ui";
import { ContentsTab } from "./components/contents-tab";
import { QuizzesTab } from "./components/quizzes-tab";
import { StatutoryTab } from "./components/statutory-tab";
import { TbmTab } from "./components/tbm-tab";
import { tabItems, type TabId } from "./education-helpers";

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<TabId>("contents");

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">교육 관리</h1>
        <p className="text-sm text-muted-foreground">
          교육자료, 퀴즈, 법정교육, TBM을 한 곳에서 관리합니다.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {tabItems.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      {activeTab === "contents" && <ContentsTab />}
      {activeTab === "quizzes" && <QuizzesTab />}
      {activeTab === "statutory" && <StatutoryTab />}
      {activeTab === "tbm" && <TbmTab />}
    </div>
  );
}
