import React from 'react';
import { render, screen } from '@testing-library/react';
import FaceEnrollmentPage from '@/app/(dashboard)/face-recognition/enroll/page';

jest.mock('@/components/ui/card', () => ({
  Card: () => <div />,
  CardContent: () => <div />,
  CardDescription: () => <div />,
  CardHeader: () => <div />,
  CardTitle: () => <div />,
}));
jest.mock('@/components/ui/button', () => ({
  default: () => <button />,
}));
jest.mock('@/components/ui/input', () => ({
  default: () => <input />,
}));
jest.mock('@/components/ui/label', () => ({
  default: () => <label />,
}));
jest.mock('@/components/ui/select', () => ({
  Select: () => <div />,
  SelectContent: () => <div />,
  SelectItem: () => <div />,
  SelectTrigger: () => <div />,
  SelectValue: () => <div />,
}));
jest.mock('@/components/ui/alert', () => ({
  Alert: () => <div />,
  AlertDescription: () => <div />,
}));
jest.mock('@/components/ui/badge', () => ({
  default: () => <span />,
}));
jest.mock('@/components/ui/progress', () => ({
  default: () => <div />,
}));

describe('FaceEnrollmentPage', () => {
  it('renders page title', () => {
    render(<FaceEnrollmentPage />);
    expect(screen.queryByText('Face Enrollment')).toBeInTheDocument();
  });
});
