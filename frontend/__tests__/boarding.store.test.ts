/**
 * Tests for the boarding Zustand store.
 * The store uses only in-memory state (no async storage) so no mocking required.
 */
import { act } from 'react';
import { useBoardingStore } from '../store/boarding.store';

// Reset store state before each test
beforeEach(() => {
  act(() => {
    useBoardingStore.setState({
      savedIds: [],
      filters: {},
      sortOption: 'RELEVANCE',
      createDraft: {},
    });
  });
});

describe('toggleSaved', () => {
  it('adds an id when not already saved', () => {
    act(() => {
      useBoardingStore.getState().toggleSaved('abc');
    });
    expect(useBoardingStore.getState().savedIds).toContain('abc');
  });

  it('removes an id when already saved', () => {
    act(() => {
      useBoardingStore.setState({ savedIds: ['abc', 'def'] });
      useBoardingStore.getState().toggleSaved('abc');
    });
    expect(useBoardingStore.getState().savedIds).not.toContain('abc');
    expect(useBoardingStore.getState().savedIds).toContain('def');
  });

  it('can toggle multiple unique ids independently', () => {
    act(() => {
      useBoardingStore.getState().toggleSaved('a');
      useBoardingStore.getState().toggleSaved('b');
    });
    const { savedIds } = useBoardingStore.getState();
    expect(savedIds).toContain('a');
    expect(savedIds).toContain('b');
  });
});

describe('isSaved', () => {
  it('returns true when id is in savedIds', () => {
    act(() => {
      useBoardingStore.setState({ savedIds: ['x'] });
    });
    expect(useBoardingStore.getState().isSaved('x')).toBe(true);
  });

  it('returns false when id is not in savedIds', () => {
    expect(useBoardingStore.getState().isSaved('missing')).toBe(false);
  });
});

describe('setSavedIds', () => {
  it('replaces the savedIds array', () => {
    act(() => {
      useBoardingStore.getState().setSavedIds(['1', '2', '3']);
    });
    expect(useBoardingStore.getState().savedIds).toEqual(['1', '2', '3']);
  });

  it('can clear savedIds by setting an empty array', () => {
    act(() => {
      useBoardingStore.setState({ savedIds: ['a', 'b'] });
      useBoardingStore.getState().setSavedIds([]);
    });
    expect(useBoardingStore.getState().savedIds).toHaveLength(0);
  });
});

describe('setFilters / clearFilters', () => {
  it('sets filters', () => {
    act(() => {
      useBoardingStore.getState().setFilters({ city: 'Kandy', minRent: 5000 } as Parameters<typeof useBoardingStore.getState.call>);
    });
    const { filters } = useBoardingStore.getState();
    expect((filters as { city?: string }).city).toBe('Kandy');
    expect((filters as { minRent?: number }).minRent).toBe(5000);
  });

  it('clearFilters resets filters to empty object', () => {
    act(() => {
      useBoardingStore.getState().setFilters({ city: 'Colombo' } as Parameters<typeof useBoardingStore.getState.call>);
      useBoardingStore.getState().clearFilters();
    });
    expect(useBoardingStore.getState().filters).toEqual({});
  });
});

describe('setSortOption', () => {
  it('sets the sort option', () => {
    act(() => {
      useBoardingStore.getState().setSortOption('PRICE_ASC' as Parameters<typeof useBoardingStore.getState.call>);
    });
    expect(useBoardingStore.getState().sortOption).toBe('PRICE_ASC');
  });
});

describe('setCreateDraft / clearCreateDraft', () => {
  it('merges new data into existing draft', () => {
    act(() => {
      useBoardingStore.getState().setCreateDraft({ title: 'My Boarding' });
      useBoardingStore.getState().setCreateDraft({ city: 'Galle' });
    });
    const { createDraft } = useBoardingStore.getState();
    expect((createDraft as { title?: string }).title).toBe('My Boarding');
    expect((createDraft as { city?: string }).city).toBe('Galle');
  });

  it('later setCreateDraft calls override earlier values for the same key', () => {
    act(() => {
      useBoardingStore.getState().setCreateDraft({ title: 'First' });
      useBoardingStore.getState().setCreateDraft({ title: 'Updated' });
    });
    expect((useBoardingStore.getState().createDraft as { title?: string }).title).toBe('Updated');
  });

  it('clearCreateDraft resets draft to empty object', () => {
    act(() => {
      useBoardingStore.getState().setCreateDraft({ title: 'Some Title' });
      useBoardingStore.getState().clearCreateDraft();
    });
    expect(useBoardingStore.getState().createDraft).toEqual({});
  });
});
