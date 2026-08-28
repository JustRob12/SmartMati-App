import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

export interface StepItem {
  number: number;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface StepperIndicatorProps {
  currentStep: number; // 1, 2, 3, etc.
  totalSteps?: number;
  steps?: StepItem[];
}

const DEFAULT_REGISTRATION_STEPS: StepItem[] = [
  { number: 1, title: 'Personal' },
  { number: 2, title: 'Address' },
  { number: 3, title: 'Security' },
  { number: 4, title: 'CAPTCHA' },
];

export const StepperIndicator: React.FC<StepperIndicatorProps> = ({
  currentStep,
  steps = DEFAULT_REGISTRATION_STEPS,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle & Label */}
              <View style={[styles.stepItem, { width: Math.max(54, Math.floor(300 / steps.length)) }]}>
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={13} color={THEME.colors.white} />
                  ) : step.icon ? (
                    <Ionicons
                      name={step.icon}
                      size={13}
                      color={isActive ? THEME.colors.white : THEME.colors.textSecondary}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    isActive && styles.stepTitleActive,
                    isCompleted && styles.stepTitleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.number < currentStep && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  circleActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.accent,
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primaryLight,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  stepNumberActive: {
    color: THEME.colors.white,
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  stepTitleActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  stepTitleCompleted: {
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: THEME.colors.border,
    marginHorizontal: 4,
    marginBottom: 14,
  },
  connectorCompleted: {
    backgroundColor: THEME.colors.primaryLight,
  },
});
