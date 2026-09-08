import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Pill, PrimaryButton, OutlineButton, StatCard, HeaderBar, LabelledInput, ActionRow } from '@/components/ui';

describe('UI primitives', () => {
  it('renders PrimaryButton and triggers onPress when clicked', () => {
    const handlePress = jest.fn();
    const { getByText } = render(<PrimaryButton label="Join Session" onPress={handlePress} />);

    const buttonText = getByText('Join Session');
    expect(buttonText).toBeTruthy();

    fireEvent.press(buttonText);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders OutlineButton correctly', () => {
    const handlePress = jest.fn();
    const { getByText } = render(<OutlineButton label="View Details" onPress={handlePress} />);

    const buttonText = getByText('View Details');
    expect(buttonText).toBeTruthy();

    fireEvent.press(buttonText);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders Pill component active and inactive state', () => {
    const { getByText, rerender } = render(<Pill label="Mathematics" active={false} />);
    expect(getByText('Mathematics')).toBeTruthy();

    rerender(<Pill label="Mathematics" active={true} />);
    expect(getByText('Mathematics')).toBeTruthy();
  });

  it('renders StatCard with value and label', () => {
    const { getByText } = render(<StatCard label="Study Hours" value="12.5 hrs" accent="#6366F1" />);

    expect(getByText('Study Hours')).toBeTruthy();
    expect(getByText('12.5 hrs')).toBeTruthy();
  });

  it('renders HeaderBar with back button', () => {
    const handleBack = jest.fn();
    const { getByText, getByTestId } = render(<HeaderBar title="Leaderboard" onBack={handleBack} />);

    expect(getByText('Leaderboard')).toBeTruthy();
    const backIcon = getByTestId('icon-arrow-back');
    expect(backIcon).toBeTruthy();

    fireEvent.press(backIcon);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders LabelledInput and fires onChangeText', () => {
    const handleChangeText = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <LabelledInput
        label="Full Name"
        value="Alex Chen"
        onChangeText={handleChangeText}
        placeholder="Enter name"
      />
    );

    expect(getByText('Full Name')).toBeTruthy();
    const input = getByPlaceholderText('Enter name');
    expect(input.props.value).toBe('Alex Chen');

    fireEvent.changeText(input, 'Jordan Smith');
    expect(handleChangeText).toHaveBeenCalledWith('Jordan Smith');
  });

  it('renders ActionRow and triggers onPress', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <ActionRow label="Notification Settings" icon="notifications-outline" onPress={handlePress} />
    );

    expect(getByText('Notification Settings')).toBeTruthy();
    fireEvent.press(getByText('Notification Settings'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});
