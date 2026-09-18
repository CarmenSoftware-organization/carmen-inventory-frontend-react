import { useCallback, useState } from "react";

export interface TitleMaster {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
  is_system: boolean;
  reference_count: number;
}

export interface AccountGroupMaster {
  id: string;
  code: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  parent_id: string | null;
  is_active: boolean;
  account_count: number;
}

interface AccountingMasterState {
  titles: TitleMaster[];
  accountGroups: AccountGroupMaster[];
}

const STORAGE_KEY = "carmen-accounting-master-mock-v1";

const seed: AccountingMasterState = {
  titles: [
    {
      id: "title-mr",
      code: "MR",
      description: "Mr.",
      is_active: true,
      is_system: true,
      reference_count: 18,
    },
    {
      id: "title-mrs",
      code: "MRS",
      description: "Mrs.",
      is_active: true,
      is_system: true,
      reference_count: 9,
    },
    {
      id: "title-dr",
      code: "DR",
      description: "Dr.",
      is_active: true,
      is_system: false,
      reference_count: 2,
    },
    {
      id: "title-khun",
      code: "KHUN",
      description: "Khun",
      is_active: false,
      is_system: false,
      reference_count: 0,
    },
  ],
  accountGroups: [
    {
      id: "group-assets",
      code: "1000",
      name: "Assets",
      level: 1,
      parent_id: null,
      is_active: true,
      account_count: 42,
    },
    {
      id: "group-current-assets",
      code: "1100",
      name: "Current Assets",
      level: 2,
      parent_id: "group-assets",
      is_active: true,
      account_count: 18,
    },
    {
      id: "group-cash",
      code: "1110",
      name: "Cash and Cash Equivalents",
      level: 3,
      parent_id: "group-current-assets",
      is_active: true,
      account_count: 7,
    },
    {
      id: "group-expense",
      code: "5000",
      name: "Operating Expenses",
      level: 1,
      parent_id: null,
      is_active: true,
      account_count: 61,
    },
    {
      id: "group-rooms",
      code: "5100",
      name: "Rooms Department",
      level: 2,
      parent_id: "group-expense",
      is_active: true,
      account_count: 16,
    },
  ],
};

function cloneSeed(): AccountingMasterState {
  return structuredClone(seed);
}

function readState(): AccountingMasterState {
  if (typeof window === "undefined") return cloneSeed();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return cloneSeed();
  try {
    return JSON.parse(stored) as AccountingMasterState;
  } catch {
    return cloneSeed();
  }
}

function writeState(state: AccountingMasterState) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveTitleState(
  state: AccountingMasterState,
  input: Omit<TitleMaster, "id" | "is_system" | "reference_count">,
  id?: string,
): AccountingMasterState {
  const current = state.titles.find((item) => item.id === id);
  const code = current?.code ?? input.code.trim().toUpperCase();
  if (
    state.titles.some(
      (item) => item.code.toUpperCase() === code && item.id !== id,
    )
  )
    throw new Error(`Title code ${code} already exists.`);
  if (current?.is_active && !input.is_active && current.reference_count > 0)
    throw new Error(
      `${current.code} is referenced by ${current.reference_count} active records.`,
    );
  return {
    ...state,
    titles: id
      ? state.titles.map((item) =>
          item.id === id
            ? {
                ...item,
                description: input.description.trim(),
                is_active: input.is_active,
              }
            : item,
        )
      : [
          ...state.titles,
          {
            id: crypto.randomUUID(),
            code,
            description: input.description.trim(),
            is_active: input.is_active,
            is_system: false,
            reference_count: 0,
          },
        ],
  };
}

export function deleteTitleState(
  state: AccountingMasterState,
  item: TitleMaster,
): AccountingMasterState {
  if (item.is_system) throw new Error(`${item.code} is system reserved.`);
  if (item.reference_count > 0)
    throw new Error(
      `${item.code} is referenced by ${item.reference_count} records.`,
    );
  return {
    ...state,
    titles: state.titles.filter((title) => title.id !== item.id),
  };
}

export function saveAccountGroupState(
  state: AccountingMasterState,
  input: Omit<AccountGroupMaster, "id" | "account_count">,
  id?: string,
): AccountingMasterState {
  const current = state.accountGroups.find((item) => item.id === id);
  const code = current?.code ?? input.code.trim().toUpperCase();
  if (
    state.accountGroups.some(
      (item) => item.code.toUpperCase() === code && item.id !== id,
    )
  )
    throw new Error(`Group code ${code} already exists.`);
  const parent = input.parent_id
    ? state.accountGroups.find((item) => item.id === input.parent_id)
    : null;
  if (input.level === 1 && input.parent_id)
    throw new Error("Level 1 groups cannot have a parent.");
  if (input.level > 1 && parent?.level !== input.level - 1)
    throw new Error(
      `Level ${input.level} requires a level ${input.level - 1} parent.`,
    );
  if (current?.is_active && !input.is_active && current.account_count > 0)
    throw new Error(
      `${current.code} contains ${current.account_count} accounts.`,
    );
  return {
    ...state,
    accountGroups: id
      ? state.accountGroups.map((item) =>
          item.id === id
            ? {
                ...item,
                name: input.name.trim(),
                level: input.level,
                parent_id: input.parent_id,
                is_active: input.is_active,
              }
            : item,
        )
      : [
          ...state.accountGroups,
          {
            ...input,
            id: crypto.randomUUID(),
            code,
            name: input.name.trim(),
            account_count: 0,
          },
        ],
  };
}

export function deleteAccountGroupState(
  state: AccountingMasterState,
  item: AccountGroupMaster,
): AccountingMasterState {
  if (item.account_count > 0)
    throw new Error(`${item.code} contains ${item.account_count} accounts.`);
  if (state.accountGroups.some((group) => group.parent_id === item.id))
    throw new Error(`${item.code} still has child groups.`);
  return {
    ...state,
    accountGroups: state.accountGroups.filter((group) => group.id !== item.id),
  };
}

export function useAccountingMasterMock() {
  const [state, setState] = useState(readState);
  const update = useCallback(
    (change: (current: AccountingMasterState) => AccountingMasterState) => {
      setState((current) => {
        const next = change(current);
        writeState(next);
        return next;
      });
    },
    [],
  );

  const saveTitle = useCallback(
    (
      input: Omit<TitleMaster, "id" | "is_system" | "reference_count">,
      id?: string,
    ) => {
      update((value) => saveTitleState(value, input, id));
    },
    [update],
  );

  const deleteTitle = useCallback(
    (item: TitleMaster) => {
      update((value) => deleteTitleState(value, item));
    },
    [update],
  );

  const saveAccountGroup = useCallback(
    (input: Omit<AccountGroupMaster, "id" | "account_count">, id?: string) => {
      update((value) => saveAccountGroupState(value, input, id));
    },
    [update],
  );

  const deleteAccountGroup = useCallback(
    (item: AccountGroupMaster) => {
      update((value) => deleteAccountGroupState(value, item));
    },
    [update],
  );

  return {
    ...state,
    saveTitle,
    deleteTitle,
    saveAccountGroup,
    deleteAccountGroup,
  };
}
