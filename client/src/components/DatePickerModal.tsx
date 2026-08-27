import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelect,
  onClose,
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date(2000, 0, 1);
  const currentYear = new Date().getFullYear();

  const [displayYear, setDisplayYear] = useState(
    isNaN(initialDate.getFullYear()) ? 2000 : initialDate.getFullYear()
  );
  const [displayMonth, setDisplayMonth] = useState(
    isNaN(initialDate.getMonth()) ? 0 : initialDate.getMonth()
  );
  const [showYearPicker, setShowYearPicker] = useState(false);

  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfMonth(displayYear, displayMonth);

  const prevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((prev) => prev - 1);
    } else {
      setDisplayMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((prev) => prev + 1);
    } else {
      setDisplayMonth((prev) => prev + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const formattedMonth = String(displayMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const result = `${displayYear}-${formattedMonth}-${formattedDay}`;
    onSelect(result);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
                  <Text style={styles.title}>Select Birthdate</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Month & Year Bar */}
              <View style={styles.navBar}>
                <TouchableOpacity
                  style={styles.navArrow}
                  onPress={prevMonth}
                  disabled={showYearPicker}
                >
                  <Ionicons name="chevron-back" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.monthYearButton}
                  onPress={() => setShowYearPicker(!showYearPicker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.monthYearText}>
                    {MONTHS[displayMonth]} {displayYear}
                  </Text>
                  <Ionicons
                    name={showYearPicker ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={THEME.colors.accentDark}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navArrow}
                  onPress={nextMonth}
                  disabled={showYearPicker}
                >
                  <Ionicons name="chevron-forward" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Year Picker Dropdown / Grid */}
              {showYearPicker ? (
                <View style={styles.yearPickerContainer}>
                  <Text style={styles.yearPickerTitle}>Select Year of Birth</Text>
                  <ScrollView
                    style={styles.yearScrollView}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.yearGrid}>
                      {years.map((yr) => {
                        const isSelected = yr === displayYear;
                        return (
                          <TouchableOpacity
                            key={yr}
                            style={[
                              styles.yearItem,
                              isSelected && styles.yearItemSelected,
                            ]}
                            onPress={() => {
                              setDisplayYear(yr);
                              setShowYearPicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.yearText,
                                isSelected && styles.yearTextSelected,
                              ]}
                            >
                              {yr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <>
                  {/* Days of Week Header */}
                  <View style={styles.daysHeaderRow}>
                    {DAYS_OF_WEEK.map((d, index) => (
                      <Text
                        key={d}
                        style={[
                          styles.dayOfWeekText,
                          index === 0 && { color: THEME.colors.accentDark },
                        ]}
                      >
                        {d}
                      </Text>
                    ))}
                  </View>

                  {/* Calendar Days Grid */}
                  <View style={styles.calendarGrid}>
                    {Array.from({ length: firstDay }, (_, i) => (
                      <View key={`empty-${i}`} style={styles.daySlot} />
                    ))}

                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNumber = i + 1;
                      const dateString = `${displayYear}-${String(displayMonth + 1).padStart(
                        2,
                        '0'
                      )}-${String(dayNumber).padStart(2, '0')}`;
                      const isSelected = dateString === selectedDate;

                      return (
                        <TouchableOpacity
                          key={`day-${dayNumber}`}
                          style={[
                            styles.daySlot,
                            isSelected && styles.daySlotSelected,
                          ]}
                          onPress={() => handleDaySelect(dayNumber)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {dayNumber}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.lg,
    width: '100%',
    maxWidth: 340,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  closeButton: {
    padding: 4,
    borderRadius: 14,
    backgroundColor: THEME.colors.surface,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  navArrow: {
    padding: 4,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  dayOfWeekText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  daySlot: {
    width: `${100 / 7}%`,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
    borderRadius: 6,
  },
  daySlotSelected: {
    backgroundColor: THEME.colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
  },
  dayTextSelected: {
    color: THEME.colors.white,
    fontWeight: '800',
  },
  yearPickerContainer: {
    maxHeight: 200,
  },
  yearPickerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  yearScrollView: {
    maxHeight: 160,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 2,
  },
  yearItem: {
    width: '30%',
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  yearItemSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  yearTextSelected: {
    color: THEME.colors.white,
    fontWeight: '800',
  },
});
