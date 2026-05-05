import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LinesTab } from "@/components/admin/LinesTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { ProcessesTab } from "@/components/admin/ProcessesTab";
import { SkillsTab } from "@/components/admin/SkillsTab";
import { OperatorsTab } from "@/components/admin/OperatorsTab";
import { ShiftsTab } from "@/components/admin/ShiftsTab";
import { TargetsTab } from "@/components/admin/TargetsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { NgCategoriesTab } from "@/components/admin/NgCategoriesTab";
import { DowntimeCategoriesTab } from "@/components/admin/DowntimeCategoriesTab";
import { AutonomousTab } from "@/components/admin/AutonomousTab";
import { ReferenceTab } from "@/components/admin/ReferenceTab";
import { GroupsTab } from "@/components/admin/GroupsTab";
import { FiveFiveLTab } from "@/components/admin/FiveFiveLTab";

const TABS = [
  { id: "lines",      label: "Lini Produksi" },
  { id: "groups",     label: "Group / Regu" },
  { id: "products",   label: "Master Produk" },
  { id: "processes",  label: "Workstation" },
  { id: "shifts",     label: "Shift" },
  { id: "ng_cat",     label: "Kategori NG" },
  { id: "dt_cat",     label: "Kategori Downtime" },
  { id: "autonomous", label: "Autonomous" },
  { id: "fivef5l",    label: "5F5L" },
  { id: "reference",  label: "Data Referensi" },
  { id: "skills",     label: "Skills" },
  { id: "operators",  label: "Operator" },
  { id: "targets",    label: "Target" },
  { id: "users",      label: "Users & Roles" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("lines");
  const [isTabLoading, setIsTabLoading] = useState(false);

  const handleTabChange = (newTab: string) => {
    setIsTabLoading(true);
    setTab(newTab);
    // Reset loading after a brief delay to show skeleton
    setTimeout(() => setIsTabLoading(false), 100);
  };

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Master Data — Admin</h1>
        <p className="text-xs text-muted-foreground mt-1">Kelola semua master data sistem produksi.</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="bg-card shadow-card overflow-x-auto flex w-full sm:w-auto justify-start">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs sm:text-sm whitespace-nowrap">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {isTabLoading ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <TabsContent value="lines"     className="mt-4"><LinesTab /></TabsContent>
            <TabsContent value="groups"    className="mt-4"><GroupsTab /></TabsContent>
            <TabsContent value="products"  className="mt-4"><ProductsTab /></TabsContent>
            <TabsContent value="processes" className="mt-4"><ProcessesTab /></TabsContent>
            <TabsContent value="shifts"    className="mt-4"><ShiftsTab /></TabsContent>
            <TabsContent value="ng_cat"    className="mt-4"><NgCategoriesTab /></TabsContent>
            <TabsContent value="dt_cat"    className="mt-4"><DowntimeCategoriesTab /></TabsContent>
            <TabsContent value="autonomous" className="mt-4"><AutonomousTab /></TabsContent>
            <TabsContent value="fivef5l"    className="mt-4"><FiveFiveLTab /></TabsContent>
            <TabsContent value="reference"  className="mt-4"><ReferenceTab /></TabsContent>
            <TabsContent value="skills"    className="mt-4"><SkillsTab /></TabsContent>
            <TabsContent value="operators" className="mt-4"><OperatorsTab /></TabsContent>
            <TabsContent value="targets"   className="mt-4"><TargetsTab /></TabsContent>
            <TabsContent value="users"     className="mt-4"><UsersTab /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
