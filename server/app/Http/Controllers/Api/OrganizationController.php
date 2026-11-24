<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Line;
use App\Models\LineStaff;
use App\Models\UnitPerson;
use App\Support\Photos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Departments, lines, line staff (6 photo slots per line), unit people and photos.
 */
class OrganizationController extends Controller
{
    public const DEFAULT_ROLES = ['IE', 'SUP', 'SUP', 'LC', 'APM', 'QC'];

    public function departments(): JsonResponse
    {
        $depts = Department::orderBy('sort_order')->orderBy('id')
            ->with(['lines', 'lines.staff', 'unitPeople'])->get();

        return response()->json($depts->map(fn ($d) => $this->presentDepartment($d)));
    }

    public function storeDepartment(Request $request): JsonResponse
    {
        $data = $this->validateDepartment($request);
        $data['sort_order'] = (int) Department::max('sort_order') + 1;
        $dept = Department::create($data);
        if ($dept->isLines()) {
            $count = (int) $request->input('line_count', 0);
            for ($i = 1; $i <= min($count, 60); $i++) {
                $this->createLine($dept, $i);
            }
        }

        return response()->json($this->presentDepartment($dept->fresh(['lines.staff', 'unitPeople'])), 201);
    }

    public function updateDepartment(Department $department, Request $request): JsonResponse
    {
        $department->update($this->validateDepartment($request, true));

        return response()->json($this->presentDepartment($department->fresh(['lines.staff', 'unitPeople'])));
    }

    public function destroyDepartment(Department $department): JsonResponse
    {
        Photos::delete($department->head_photo);
        $department->delete();

        return response()->json(['ok' => true]);
    }

    public function reorderDepartments(Request $request): JsonResponse
    {
        $ids = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer'])['ids'];
        foreach ($ids as $i => $id) {
            Department::where('id', $id)->update(['sort_order' => $i + 1]);
        }

        return response()->json(['ok' => true]);
    }

    public function headPhoto(Department $department, Request $request): JsonResponse
    {
        if ($request->boolean('remove')) {
            Photos::delete($department->head_photo);
            $department->update(['head_photo' => null]);
        } else {
            $request->validate(['photo' => 'required|image|max:8192']);
            Photos::delete($department->head_photo);
            $department->update(['head_photo' => Photos::store($request->file('photo'), 'head-'.$department->code)]);
        }

        return response()->json($this->presentDepartment($department->fresh(['lines.staff', 'unitPeople'])));
    }

    public function storeLine(Department $department, Request $request): JsonResponse
    {
        $number = (int) $request->input('number', ((int) $department->lines()->max('number')) + 1);
        $line = $this->createLine($department, $number, $request->input('name'));

        return response()->json($this->presentLine($line->fresh('staff')), 201);
    }

    public function updateLine(Line $line, Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => 'sometimes|integer|min:0|max:999',
            'name' => 'nullable|string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);
        $line->update($data);

        return response()->json($this->presentLine($line->fresh('staff')));
    }

    public function destroyLine(Line $line): JsonResponse
    {
        foreach ($line->staff as $s) {
            Photos::delete($s->photo);
        }
        $line->delete();

        return response()->json(['ok' => true]);
    }

    /** Update one of the 6 staff slots of a line (multipart: role, name, is_vacant, photo, remove_photo). */
    public function updateStaff(Line $line, int $position, Request $request): JsonResponse
    {
        abort_if($position < 1 || $position > 6, 422, 'Position must be 1-6');
        $request->validate([
            'role' => 'nullable|string|max:30',
            'name' => 'nullable|string|max:100',
            'photo' => 'nullable|image|max:8192',
        ]);
        $slot = LineStaff::firstOrNew(['line_id' => $line->id, 'position' => $position]);
        if ($request->has('role')) {
            $slot->role = trim((string) $request->input('role'));
        }
        if ($request->has('name')) {
            $slot->name = trim((string) $request->input('name'));
        }
        if ($request->has('is_vacant')) {
            $slot->is_vacant = $request->boolean('is_vacant');
        }
        if ($request->boolean('remove_photo')) {
            Photos::delete($slot->photo);
            $slot->photo = null;
        }
        if ($request->hasFile('photo')) {
            Photos::delete($slot->photo);
            $slot->photo = Photos::store($request->file('photo'), ($slot->role ?: 'staff').'-'.($slot->name ?: $position));
            $slot->is_vacant = false;
        }
        $slot->save();

        return response()->json($this->presentLine($line->fresh('staff')));
    }

    public function storeUnitPerson(Department $department, Request $request): JsonResponse
    {
        $data = $request->validate(['label' => 'required|string|max:150', 'photo' => 'nullable|image|max:8192']);
        $person = UnitPerson::create([
            'department_id' => $department->id,
            'label' => $data['label'],
            'sort_order' => (int) $department->unitPeople()->max('sort_order') + 1,
            'photo' => $request->hasFile('photo') ? Photos::store($request->file('photo'), $data['label']) : null,
        ]);

        return response()->json($this->presentPerson($person), 201);
    }

    public function updateUnitPerson(UnitPerson $person, Request $request): JsonResponse
    {
        $request->validate(['label' => 'sometimes|string|max:150', 'photo' => 'nullable|image|max:8192']);
        if ($request->has('label')) {
            $person->label = $request->input('label');
        }
        if ($request->boolean('remove_photo')) {
            Photos::delete($person->photo);
            $person->photo = null;
        }
        if ($request->hasFile('photo')) {
            Photos::delete($person->photo);
            $person->photo = Photos::store($request->file('photo'), $person->label);
        }
        $person->save();

        return response()->json($this->presentPerson($person));
    }

    public function destroyUnitPerson(UnitPerson $person): JsonResponse
    {
        Photos::delete($person->photo);
        DB::table('unit_metrics')->where('unit_person_id', $person->id)->delete();
        $person->delete();

        return response()->json(['ok' => true]);
    }

    // ------------------------------------------------------------------

    private function createLine(Department $dept, int $number, ?string $name = null): Line
    {
        $line = Line::create([
            'department_id' => $dept->id, 'number' => $number, 'name' => $name, 'sort_order' => $number,
        ]);
        foreach (self::DEFAULT_ROLES as $i => $role) {
            LineStaff::create(['line_id' => $line->id, 'position' => $i + 1, 'role' => $role, 'is_vacant' => true]);
        }

        return $line;
    }

    private function validateDepartment(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes|' : 'required|';

        return $request->validate([
            'code' => $req.'string|max:50',
            'name' => $req.'string|max:150',
            'kind' => ($partial ? 'sometimes|' : 'required|').'in:lines,unit',
            'head_label' => 'nullable|string|max:150',
            'goal_group' => 'nullable|string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);
    }

    public function presentDepartment(Department $d): array
    {
        return [
            'id' => $d->id, 'code' => $d->code, 'name' => $d->name, 'kind' => $d->kind,
            'head_label' => $d->head_label, 'head_photo_url' => Photos::url($d->head_photo),
            'goal_group' => $d->goal_group, 'sort_order' => $d->sort_order, 'is_active' => $d->is_active,
            'lines' => $d->lines->map(fn ($l) => $this->presentLine($l))->values(),
            'unit_people' => $d->unitPeople->map(fn ($p) => $this->presentPerson($p))->values(),
        ];
    }

    public function presentLine(Line $l): array
    {
        $staff = [];
        $byPos = $l->staff->keyBy('position');
        for ($p = 1; $p <= 6; $p++) {
            $s = $byPos->get($p);
            $staff[] = [
                'position' => $p,
                'role' => $s?->role ?? '',
                'name' => $s?->name ?? '',
                'is_vacant' => $s ? (bool) $s->is_vacant : true,
                'photo_url' => Photos::url($s?->photo),
            ];
        }

        return [
            'id' => $l->id, 'department_id' => $l->department_id, 'number' => $l->number,
            'name' => $l->name, 'label' => $l->label(), 'is_active' => $l->is_active, 'staff' => $staff,
        ];
    }

    public function presentPerson(UnitPerson $p): array
    {
        return ['id' => $p->id, 'department_id' => $p->department_id, 'label' => $p->label, 'photo_url' => Photos::url($p->photo)];
    }
}
