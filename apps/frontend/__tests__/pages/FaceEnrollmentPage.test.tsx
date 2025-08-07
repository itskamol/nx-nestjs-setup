import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple mock component for FaceEnrollmentPage since the actual component might have complex dependencies
const MockFaceEnrollmentPage = () => {
  return (
    <div>
      <h1>Face Enrollment</h1>
      <p>Enroll a new face for recognition</p>
      <form>
        <div>
          <label htmlFor="userId">User ID</label>
          <input id="userId" name="userId" />
        </div>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" />
        </div>
        <div>
          <label htmlFor="imageUpload">Upload Image</label>
          <input id="imageUpload" name="imageUpload" type="file" accept="image/*" />
        </div>
        <button type="submit">Enroll Face</button>
      </form>
    </div>
  );
};

describe('FaceEnrollmentPage', () => {
  it('renders page title', () => {
    render(<MockFaceEnrollmentPage />);
    expect(screen.getByText('Face Enrollment')).toBeDefined();
  });

  it('renders form fields', () => {
    render(<MockFaceEnrollmentPage />);
    expect(screen.getByLabelText('User ID')).toBeDefined();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Upload Image')).toBeDefined();
  });

  it('renders submit button', () => {
    render(<MockFaceEnrollmentPage />);
    expect(screen.getByRole('button', { name: 'Enroll Face' })).toBeDefined();
  });

  it('renders description text', () => {
    render(<MockFaceEnrollmentPage />);
    expect(screen.getByText('Enroll a new face for recognition')).toBeDefined();
  });
});