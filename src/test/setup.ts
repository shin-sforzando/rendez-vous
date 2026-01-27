import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})
