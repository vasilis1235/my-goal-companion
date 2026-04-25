// Quick placeholder pages for Progress, Diet, Profile, Settings — full versions in next pass
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const PlaceholderPage = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">{title}</h2>
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <Construction className="w-5 h-5 text-warning" />
        <CardTitle className="text-base">Σύντομα διαθέσιμη</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {children ?? "Η σελίδα χτίζεται. Θα είναι έτοιμη σε επόμενη ενημέρωση."}
      </CardContent>
    </Card>
  </div>
);
