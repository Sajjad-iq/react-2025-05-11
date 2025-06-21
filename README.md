
## Professional React Developer Test: Advanced Datatable \& Logic Challenge

### Task 1: Enterprise-Grade User Management Datatable (2-3 hours)

**Objective:** Build a React datatable with complex functionality using the GitHub Issues API (`https://api.github.com/repos/[owner]/[repo]/issues`)
//https://api.github.com/repos/facebook/react/issues
**Core Requirements:**

1. **Server-Side Operations:**
    - Implement pagination with page size selection (10/25/50 rows)
    - Add sorting by multiple columns (created_at, updated_at, title)
    - Support nested sorting (primary/secondary sort columns)
    - API parameters must include `page`, `per_page`, `sort`, `direction`
2. **Advanced Features:**

```jsx
// Example column configuration
const columns = [
  { 
    id: 'title', 
    header: 'Issue Title',
    visible: true,
    sortable: true,
    filterType: 'text'
  },
  {
    id: 'state',
    header: 'Status',
    visible: true,
    sortable: false,
    filterType: 'dropdown',
    options: ['open', 'closed']
  }
];
```

    - Column visibility toggles with persistence (localStorage)
    - Custom filter types per column (text input, dropdown, date range)
    - Loading states with skeleton placeholders
3. **Performance Optimization:**
    - Window virtualization for large datasets
    - Memoized table components
    - Client-side caching of API responses (TTL: 5 minutes)
4. **Error Handling:**
    - API error recovery with retry logic
    - Empty state UI
    - Network connectivity detection

**Bonus Points For:**

- TypeScript implementation
- Unit tests for sorting/filtering logic
- Accessibility compliance (WCAG 2.1)
- Responsive design for mobile

---

### Task 2: Logic \& Optimization Challenge (45 minutes)

**Problem:** Fix and optimize this flawed search component:

```jsx
function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [query]);

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {results.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Required Fixes:**

1. **Debounce Search Input** - Prevent API spamming
2. **Race Condition Handling** - Cancel outdated requests
3. **Memory Leak Prevention** - Cleanup abandoned requests
4. **Error Boundaries** - Add error handling
5. **Performance Optimization** - Memoize/cache results

**Evaluation Criteria:**

- Understanding of React hooks lifecycle
- Asynchronous state management
- Optimization techniques
- Error handling strategies

---

### Implementation Recommendations:

1. **Use CodeSandbox/StackBlitz:** We expect a response with a single URL for the CodeSandbox/StackBlitz container.
2. **Scoring Rubric:**


| Category | Weight | Evaluation Method |
| :-- | :-- | :-- |
| Functionality | 40% | Automated test suite |
| Code Quality | 30% | ESLint/Prettier rules |
| Performance | 20% | Lighthouse audit |
| Documentation | 10% | Code comments/README |
