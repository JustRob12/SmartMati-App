import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface StepperIndicatorProps {
  currentStep: number; // 1, 2, 3, 4
  totalSteps?: number;
}

export const StepperIndicator: React.FC<StepperIndicatorProps> = ({
  currentStep,
  totalSteps = 4,
}) => {
  const steps = [
    { number: 1, title: 'Personal' },
    { number: 2, title: 'Address' },
    { number: 3, title: 'Security' },
    { number: 4, title: 'CAPTCHA' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle & Label */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color={THEME.colors.white} />
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
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 62,
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
    marginHorizontal: 2,
    marginBottom: 14,
  },
  connectorCompleted: {
    backgroundColor: THEME.colors.primaryLight,
  },
});
