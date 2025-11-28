# CSS Modules Usage Guide

## 📚 Overview

This project uses **CSS Modules** to prevent CSS conflicts and maintain scoped styles. This document explains our patterns and best practices.

---

## ✅ Standard CSS Modules Pattern

**Used in:** Most components (Header, Footer, LessonCard, etc.)

### How it works:

**CSS File:** `Component.module.css`
```css
.container {
  background: #fff;
}

.button {
  padding: 10px;
}
```

**React Component:**
```jsx
import styles from './Component.module.css';

function Component() {
  return (
    <div className={styles.container}>
      <button className={styles.button}>Click</button>
    </div>
  );
}
```

**Result:** Classes are automatically scoped → No conflicts! ✅

---

## ⚠️ Mixed Pattern: CSS Modules + Global Classes

**Used in:** `dictationPage` (special case for dynamic HTML)

### Why we use this pattern:

The dictation page generates HTML dynamically using `innerHTML` for interactive word inputs. Since these elements are created as strings at runtime, we can't use CSS Modules classes directly.

### How it works:

**CSS File:** `dictationPage.module.css`
```css
/* Parent container uses CSS Modules */
.dictationInputArea {
  padding: 20px;
}

/* Children use :global() for dynamically generated elements */
.dictationInputArea :global(.word-input) {
  border: 1px solid blue;
}

.dictationInputArea :global(.correct-word) {
  color: green;
}
```

**React Component:**
```jsx
import styles from './dictationPage.module.css';

// Container uses CSS Modules
<div className={styles.dictationInputArea}>
  {/* Dynamic HTML with global classes */}
  <span dangerouslySetInnerHTML={{
    __html: `<input class="word-input" />`
  }} />
</div>
```

### Scoping mechanism:

Although we use `:global()`, these classes are **SCOPED** within `.dictationInputArea`, meaning:

✅ **Safe:** Only affects elements inside `.dictationInputArea`
✅ **No conflicts:** Won't affect other components
✅ **Documented:** Pattern is clearly explained in code comments

---

## 🌍 Global Styles

**File:** `globals.css` (imported in `_app.js`)

Used for:
- CSS variables (`:root`)
- Global resets
- Body/HTML styles
- Utility classes used across the app

**This is intentional and acceptable** ✅

---

## 📋 File Organization

```
styles/
├── CSS_MODULES_GUIDE.md          ← This file
├── globals.css                    ← Global styles (CSS vars, resets)
├── shadowingPage.module.css       ← Scoped to shadowing page
├── dictationPage.module.css       ← Mixed pattern (documented)
├── Header.module.css              ← Scoped to Header component
├── Footer.module.css              ← Scoped to Footer component
└── ...other .module.css files     ← Each component has its own
```

---

## 🎯 Best Practices

### ✅ DO:

1. **Use CSS Modules for all new components**
   ```jsx
   import styles from './Component.module.css';
   <div className={styles.myClass}>
   ```

2. **Use meaningful class names**
   ```css
   .userProfileCard { }      /* Good */
   .card { }                 /* Too generic */
   ```

3. **Compose styles when needed**
   ```jsx
   <div className={`${styles.card} ${styles.active}`}>
   ```

4. **Document when using `:global()`**
   - Add comments explaining why
   - Reference this guide

### ❌ DON'T:

1. **Don't use global classes unnecessarily**
   ```jsx
   <div className="my-component"> ❌
   ```

2. **Don't create new `.css` files (use `.module.css`)**

3. **Don't use inline styles unless absolutely necessary**
   ```jsx
   <div style={{color: 'red'}}> ❌ (prefer CSS Modules)
   ```

---

## 🔍 Special Cases

### Case 1: Dynamic HTML (like dictation page)

**Pattern:** CSS Modules + `:global()`

**Documentation required:**
- Comment in CSS file
- Comment in JS file
- Reference this guide

**See:**
- `styles/dictationPage.module.css` (line 977)
- `pages/dictation/[lessonId].js` (line 1186)

### Case 2: Third-party libraries

Some libraries require global classes. In this case:
- Import in `_app.js`
- Document the requirement
- Example: `react-toastify/dist/ReactToastify.css`

---

## 📊 Current Status

### Files using CSS Modules: ✅
- ✅ shadowingPage.module.css
- ✅ dictationPage.module.css (mixed pattern - documented)
- ✅ Header.module.css
- ✅ Footer.module.css
- ✅ LessonCard.module.css
- ✅ All other `.module.css` files

### Files using global CSS: ✅ (Intentional)
- ✅ globals.css (CSS variables, resets)
- ✅ Third-party: react-toastify

### Files to migrate: ⚠️
- VocabularyPopup.js (currently uses inline styles)

---

## 🚀 Migration Guide

To convert a component to CSS Modules:

1. **Create CSS Module file:**
   ```
   ComponentName.module.css
   ```

2. **Move styles:**
   ```css
   .container { ... }
   .button { ... }
   ```

3. **Update component:**
   ```jsx
   import styles from './ComponentName.module.css';
   // Replace className="container" with className={styles.container}
   ```

4. **Test thoroughly**

---

## 📚 Resources

- [Next.js CSS Modules Docs](https://nextjs.org/docs/basic-features/built-in-css-support#adding-component-level-css)
- [CSS Modules GitHub](https://github.com/css-modules/css-modules)

---

## 🤝 Questions?

If you're unsure about which pattern to use:

1. **Default:** Always use CSS Modules
2. **Special case (dynamic HTML):** Use mixed pattern + document it
3. **Ask the team** if you're not sure

---

**Last updated:** 2025-01-15
**Pattern status:** ✅ Stable and documented
