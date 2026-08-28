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

  const formattedSelectedPreview = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'None selected';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              {/* Top Decorative Accent */}
              <View style={styles.topAccent} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.calendarIconBadge}>
                    <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Select Birthdate</Text>
                    <Text style={styles.subtitle}>Tap a date on the calendar</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Month & Year Navigation Bar */}
              <View style={styles.navBar}>
                <TouchableOpacity
                  style={styles.navArrow}
                  onPress={prevMonth}
                  disabled={showYearPicker}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={showYearPicker ? THEME.colors.textMuted : THEME.colors.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.monthYearPill}
                  onPress={() => setShowYearPicker(!showYearPicker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.monthYearText}>
                    {MONTHS[displayMonth]} {displayYear}
                  </Text>
                  <View style={styles.chevronPill}>
                    <Ionicons
                      name={showYearPicker ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={THEME.colors.primary}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navArrow}
                  onPress={nextMonth}
                  disabled={showYearPicker}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={showYearPicker ? THEME.colors.textMuted : THEME.colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Year Picker Dropdown / Grid */}
              {showYearPicker ? (
                <View style={styles.yearPickerContainer}>
                  <Text style={styles.yearPickerTitle}>Select Year of Birth</Text>
                  <ScrollView
                    style={styles.yearScrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.yearGrid}
                  >
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
                          activeOpacity={0.7}
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
                  </ScrollView>
                </View>
              ) : (
                <>
                  {/* Days of Week Header */}
                  <View style={styles.daysHeaderRow}>
                    {DAYS_OF_WEEK.map((d, index) => (
                      <View key={d} style={styles.dayOfWeekSlot}>
                        <Text
                          style={[
                            styles.dayOfWeekText,
                            index === 0 && styles.sundayText,
                          ]}
                        >
                          {d}
                        </Text>
                      </View>
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

              {/* Bottom Quick Bar */}
              <View style={styles.footerRow}>
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Selected:</Text>
                  <Text style={styles.previewDate}>{formattedSelectedPreview}</Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelFooterButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelFooterText}>Close</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  content: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: THEME.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthYearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  chevronPill: {
    backgroundColor: THEME.colors.primarySoft,
    borderRadius: 8,
    padding: 2,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dayOfWeekSlot: {
    width: 38,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  sundayText: {
    color: THEME.colors.accentDark,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  daySlot: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  daySlotSelected: {
    backgroundColor: THEME.colors.primary,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dayTextSelected: {
    color: THEME.colors.white,
    fontWeight: '900',
  },
  yearPickerContainer: {
    maxHeight: 220,
    paddingVertical: 4,
  },
  yearPickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearScrollView: {
    maxHeight: 180,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  yearItem: {
    width: '30%',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearItemSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  yearTextSelected: {
    color: THEME.colors.white,
    fontWeight: '900',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  previewDate: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  cancelFooterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
