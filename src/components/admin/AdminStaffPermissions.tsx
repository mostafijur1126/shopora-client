import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
  Edit2,
} from "lucide-react";
import {
  createStaffApi,
  deleteStaffApi,
  fetchStaff,
  StaffFormData,
  StaffRecord,
  StaffStatus,
  updateStaffApi,
} from "../../services/api";
import { StaffRole } from "../../types";

const roles: StaffRole[] = ["Super Admin", "Manager", "Support", "Seller"];

const emptyForm = (): StaffFormData => ({
  name: "",
  email: "",
  password: "",
  phone: "",
  status: "active",
  role: "Manager",
  joiningDate: new Date().toISOString().slice(0, 10),
  designation: "",
  address: "",
});

const inputClassName =
  "w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const AdminStaffPermissions: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(emptyForm);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setStaffList(await fetchStaff());
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load staff members.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const showFeedback = (message: string) => {
    setFeedbackMsg(message);
    window.setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const openAddForm = () => {
    setEditingStaff(null);
    setFormData(emptyForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditForm = (staff: StaffRecord) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: "",
      phone: staff.phone,
      status: staff.status,
      role: staff.role,
      joiningDate: new Date(staff.joiningDate).toISOString().slice(0, 10),
      designation: staff.designation,
      address: staff.address,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const updateFormField = <K extends keyof StaffFormData>(
    key: K,
    value: StaffFormData[K],
  ) => setFormData((current) => ({ ...current, [key]: value }));

  const handleSaveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingStaff) {
        const { password, ...details } = formData;
        const updated = await updateStaffApi(editingStaff.id, {
          ...details,
          ...(password ? { password } : {}),
        });
        setStaffList((current) =>
          current.map((staff) => (staff.id === updated.id ? updated : staff)),
        );
        showFeedback(`Staff member "${updated.name}" updated.`);
      } else {
        const created = await createStaffApi(formData);
        setStaffList((current) => [created, ...current]);
        showFeedback(`Staff member "${created.name}" added.`);
      }
      setIsModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save staff member.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffRecord) => {
    const status: StaffStatus =
      staff.status === "active" ? "inactive" : "active";
    setBusyStaffId(staff.id);
    try {
      const updated = await updateStaffApi(staff.id, { status });
      setStaffList((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      showFeedback(`${staff.name} is now ${status}.`);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not update staff status.",
      );
    } finally {
      setBusyStaffId(null);
    }
  };

  const handleDeleteStaff = async (staff: StaffRecord) => {
    if (!window.confirm(`Delete "${staff.name}" from the staff roster?`))
      return;
    setBusyStaffId(staff.id);
    setLoadError(null);
    try {
      await deleteStaffApi(staff.id);
      setStaffList((current) => current.filter((item) => item.id !== staff.id));
      showFeedback(`Staff member "${staff.name}" deleted.`);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not delete staff member.",
      );
    } finally {
      setBusyStaffId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-montserrat text-xl font-bold text-[#191c1d]">
              Staff Management
            </h2>
            <span className="rounded-full border border-[#00503a]/20 bg-[#e7f6f0] px-2.5 py-0.5 text-xs font-bold text-[#00503a]">
              {staffList.length} Members
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Manage staff accounts, roles, and active status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {feedbackMsg && (
            <div
              role="status"
              className="rounded-xl border border-[#00503a]/20 bg-[#e7f6f0] px-3 py-1.5 text-xs font-bold text-[#00503a]"
            >
              {feedbackMsg}
            </div>
          )}
          <button
            onClick={openAddForm}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#00503a] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#003828] sm:text-sm"
          >
            <UserPlus className="h-4 w-4 text-[#9ef4d0]" />
            Add New Staff
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <span>{loadError}</span>
          <button
            onClick={() => void loadStaff()}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-12 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading staff...
        </div>
      ) : staffList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          No staff accounts yet. Add a staff member to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {staffList.map((staff) => (
            <article
              key={staff.id}
              className="space-y-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00503a] font-montserrat text-lg font-black text-white">
                    {staff.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-gray-900">
                        {staff.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          staff.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {staff.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[#00503a]">
                      {staff.role} · {staff.designation}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEditForm(staff)}
                    disabled={busyStaffId === staff.id}
                    className="cursor-pointer rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-[#00503a] hover:text-white disabled:opacity-50"
                    title="Edit staff member"
                    aria-label={`Edit ${staff.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDeleteStaff(staff)}
                    disabled={busyStaffId === staff.id}
                    className="cursor-pointer rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-rose-600 hover:text-white disabled:opacity-50"
                    title="Delete staff member"
                    aria-label={`Delete ${staff.name}`}
                  >
                    {busyStaffId === staff.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs text-gray-600">
                <p className="font-mono text-[11px] font-bold text-gray-500">
                  Employee ID: {staff.employeeId}
                </p>
                <p className="flex items-center gap-2 font-mono">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="break-all">{staff.email}</span>
                </p>
                <p className="flex items-center gap-2 font-mono">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span>{staff.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span>Joined {formatDate(staff.joiningDate)}</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span>{staff.address}</span>
                </p>
              </div>

              <button
                onClick={() => void handleToggleStatus(staff)}
                disabled={busyStaffId === staff.id}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#00503a] hover:underline disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {staff.status === "active"
                  ? "Deactivate account"
                  : "Activate account"}
              </button>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
          <div className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-100 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[#00503a] p-5 text-white">
              <div>
                <h3 className="font-montserrat text-base font-bold">
                  {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
                </h3>
                {editingStaff && (
                  <p className="mt-1 text-xs text-white/75">
                    Employee ID: {editingStaff.employeeId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                >
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Name *
                  <input
                    required
                    minLength={2}
                    maxLength={150}
                    value={formData.name}
                    onChange={(event) =>
                      updateFormField("name", event.target.value)
                    }
                    className={inputClassName}
                    autoComplete="name"
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Email *
                  <input
                    required
                    type="email"
                    maxLength={200}
                    value={formData.email}
                    onChange={(event) =>
                      updateFormField("email", event.target.value)
                    }
                    className={inputClassName}
                    autoComplete="email"
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Password{" "}
                  {editingStaff ? "(leave blank to keep current)" : "*"}
                  <input
                    required={!editingStaff}
                    type="password"
                    minLength={8}
                    maxLength={72}
                    value={formData.password}
                    onChange={(event) =>
                      updateFormField("password", event.target.value)
                    }
                    className={inputClassName}
                    autoComplete="new-password"
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Phone Number *
                  <input
                    required
                    maxLength={30}
                    value={formData.phone}
                    onChange={(event) =>
                      updateFormField("phone", event.target.value)
                    }
                    className={inputClassName}
                    autoComplete="tel"
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Role *
                  <select
                    required
                    value={formData.role}
                    onChange={(event) =>
                      updateFormField("role", event.target.value as StaffRole)
                    }
                    className={inputClassName}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Status *
                  <select
                    required
                    value={formData.status}
                    onChange={(event) =>
                      updateFormField(
                        "status",
                        event.target.value as StaffStatus,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Joining Date *
                  <input
                    required
                    type="date"
                    value={formData.joiningDate}
                    onChange={(event) =>
                      updateFormField("joiningDate", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-gray-700">
                  Designation *
                  <input
                    required
                    maxLength={100}
                    value={formData.designation}
                    onChange={(event) =>
                      updateFormField("designation", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
              </div>
              <label className="block space-y-1 text-xs font-bold text-gray-700">
                Address *
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={formData.address}
                  onChange={(event) =>
                    updateFormField("address", event.target.value)
                  }
                  className={inputClassName}
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="cursor-pointer rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-w-32 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#00503a] px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-[#003828] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingStaff ? "Save Changes" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
