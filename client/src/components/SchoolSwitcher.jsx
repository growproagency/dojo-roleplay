import { useQuery } from "@tanstack/react-query";
import { fetchAdminSchools } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useViewingSchool } from "@/contexts/ViewingSchoolContext";

const PLATFORM_VALUE = "__platform__";

export default function SchoolSwitcher() {
  const { viewingSchoolId, setViewingSchoolId } = useViewingSchool();
  const { data: schools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAdminSchools,
  });

  const value = viewingSchoolId == null ? PLATFORM_VALUE : String(viewingSchoolId);
  const onChange = (v) => {
    if (v === PLATFORM_VALUE) setViewingSchoolId(null);
    else setViewingSchoolId(parseInt(v, 10));
  };

  return (
    <div className="min-w-0 w-full">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
        Global admin
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm font-semibold px-2 -ml-1 border-transparent hover:bg-secondary">
          <SelectValue placeholder="Platform view" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PLATFORM_VALUE}>Platform view</SelectItem>
          {(schools ?? []).map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
