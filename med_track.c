/*
 * Medicine Reminder and Management System
 * ---------------------------------------
 * Create medicine profiles (person, condition, medicine, category,
 * daily frequency, reminder times), see today's schedule with
 * DUE / MISSED / UPCOMING status, mark doses as taken, and keep
 * everything saved between runs. Taken-status resets every new day.
 *
 * Compile: gcc medicine_reminder.c -o medicine_reminder
 * Run:     ./medicine_reminder
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <time.h>

#define MAX_MEDS   50
#define MAX_DOSES  6      /* max times per day for one medicine */
#define STR_LEN    50
#define DATA_FILE  "medicines.dat"
#define DUE_WINDOW 30     /* minutes after reminder time still shown as "DUE NOW" */

typedef struct {
    char person[STR_LEN];
    char condition[STR_LEN];
    char name[STR_LEN];
    char category[STR_LEN];
    int  freq;                      /* doses per day */
    char times[MAX_DOSES][6];       /* "HH:MM" */
    int  taken[MAX_DOSES];          /* 1 = taken today */
} Medicine;

typedef struct {                    /* one scheduled dose for today */
    int med;
    int dose;
    int minutes;                    /* minutes since midnight */
} Slot;

static Medicine meds[MAX_MEDS];
static int count = 0;

/* ---------- input helpers ---------- */

static void read_line(const char *prompt, char *buf, int size) {
    for (;;) {
        printf("%s", prompt);
        if (!fgets(buf, size, stdin)) { buf[0] = '\0'; return; }
        buf[strcspn(buf, "\n")] = '\0';
        if (buf[0] != '\0') return;
        printf("  Input cannot be empty.\n");
    }
}

static int read_int(const char *prompt, int min, int max) {
    char line[64];
    int v;
    for (;;) {
        printf("%s", prompt);
        if (!fgets(line, sizeof line, stdin)) return min;
        if (sscanf(line, "%d", &v) == 1 && v >= min && v <= max) return v;
        printf("  Enter a number between %d and %d.\n", min, max);
    }
}

/* Parses "HH:MM" (24-hour). Returns minutes since midnight or -1. */
static int parse_time(const char *s) {
    int h, m;
    char extra;
    if (sscanf(s, "%d:%d%c", &h, &m, &extra) != 2) return -1;
    if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
}

static void read_time(const char *prompt, char out[6]) {
    char buf[32];
    int mins;
    for (;;) {
        read_line(prompt, buf, sizeof buf);
        mins = parse_time(buf);
        if (mins >= 0) {
            snprintf(out, 6, "%02d:%02d", (mins / 60) % 24, mins % 60);
            return;
        }
        printf("  Invalid time. Use 24-hour HH:MM (e.g. 08:30, 21:00).\n");
    }
}

static int equals_ignore_case(const char *a, const char *b) {
    while (*a && *b) {
        if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) return 0;
        a++; b++;
    }
    return *a == *b;
}

static int now_minutes(void) {
    time_t t = time(NULL);
    struct tm *tm = localtime(&t);
    return tm->tm_hour * 60 + tm->tm_min;
}

static int today_stamp(void) {
    time_t t = time(NULL);
    struct tm *tm = localtime(&t);
    return (tm->tm_year + 1900) * 10000 + (tm->tm_mon + 1) * 100 + tm->tm_mday;
}

/* ---------- file storage ---------- */

static void save_data(void) {
    FILE *fp = fopen(DATA_FILE, "wb");
    int stamp = today_stamp();
    if (!fp) { printf("Warning: could not save data.\n"); return; }
    fwrite(&stamp, sizeof stamp, 1, fp);
    fwrite(&count, sizeof count, 1, fp);
    fwrite(meds, sizeof(Medicine), count, fp);
    fclose(fp);
}

static void load_data(void) {
    FILE *fp = fopen(DATA_FILE, "rb");
    int stamp = 0, n = 0, i, d;
    if (!fp) return;
    if (fread(&stamp, sizeof stamp, 1, fp) != 1 ||
        fread(&n, sizeof n, 1, fp) != 1 || n < 0 || n > MAX_MEDS) {
        fclose(fp);
        return;
    }
    count = (int)fread(meds, sizeof(Medicine), n, fp);
    fclose(fp);

    if (stamp != today_stamp()) {            /* new day: reset taken flags */
        for (i = 0; i < count; i++)
            for (d = 0; d < MAX_DOSES; d++)
                meds[i].taken[d] = 0;
        save_data();
    }
}

/* ---------- schedule helpers ---------- */

static int cmp_slots(const void *a, const void *b) {
    return ((const Slot *)a)->minutes - ((const Slot *)b)->minutes;
}

/* Fills slots with all of today's doses sorted by time. */
static int build_schedule(Slot *slots) {
    int n = 0, i, d;
    for (i = 0; i < count; i++)
        for (d = 0; d < meds[i].freq; d++) {
            slots[n].med = i;
            slots[n].dose = d;
            slots[n].minutes = parse_time(meds[i].times[d]);
            n++;
        }
    qsort(slots, n, sizeof(Slot), cmp_slots);
    return n;
}

static void print_status(const Medicine *m, int dose, int now) {
    int t = parse_time(m->times[dose]);
    if (m->taken[dose])            printf("[TAKEN]");
    else if (now < t)              printf("[UPCOMING - in %d min]", t - now);
    else if (now - t <= DUE_WINDOW) printf("[** DUE NOW **]");
    else                           printf("[MISSED - %d min late]", now - t);
}

static void print_schedule(Slot *slots, int n, int numbered) {
    int now = now_minutes(), i;
    printf("\n%s %-5s  %-12s %-18s %-14s %s\n",
           numbered ? "No." : "   ", "Time", "Person", "Medicine", "Condition", "Status");
    printf("-----------------------------------------------------------------------------\n");
    for (i = 0; i < n; i++) {
        Medicine *m = &meds[slots[i].med];
        if (numbered) printf("%2d. ", i + 1); else printf("    ");
        printf("%-5s  %-12s %-18s %-14s ",
               m->times[slots[i].dose], m->person, m->name, m->condition);
        print_status(m, slots[i].dose, now);
        printf("\n");
    }
}

/* ---------- category selection ---------- */

static const char *CATEGORIES[] = {
    "Antidiabetic (Blood Sugar)",
    "Antihypertensive (Blood Pressure)",
    "Thyroid Hormone",
    "Cholesterol / Statin",
    "Antibiotic",
    "Pain Reliever / Anti-inflammatory",
    "Antacid / Digestive",
    "Antihistamine / Allergy",
    "Heart Medicine",
    "Vitamin / Supplement",
    "Antidepressant / Mental Health",
    "Asthma / Respiratory"
};
#define NUM_CATEGORIES ((int)(sizeof CATEGORIES / sizeof CATEGORIES[0]))

static void choose_category(char *out, int size) {
    int i, choice;
    printf("\nSelect medicine category:\n");
    for (i = 0; i < NUM_CATEGORIES; i++)
        printf("  %2d. %s\n", i + 1, CATEGORIES[i]);
    printf("  %2d. Other (type your own)\n", NUM_CATEGORIES + 1);

    choice = read_int("Category number: ", 1, NUM_CATEGORIES + 1);
    if (choice <= NUM_CATEGORIES) {
        strncpy(out, CATEGORIES[choice - 1], size - 1);
        out[size - 1] = '\0';
    } else {
        read_line("Enter category: ", out, size);
    }
}

/* ---------- features ---------- */

static void add_medicine(void) {
    Medicine m;
    int d;
    char prompt[64];

    if (count >= MAX_MEDS) { printf("Medicine list is full.\n"); return; }
    memset(&m, 0, sizeof m);

    printf("\n--- Add Medicine Profile ---\n");
    read_line("Person's name       : ", m.person, STR_LEN);
    read_line("Health condition    : ", m.condition, STR_LEN);
    read_line("Medicine name       : ", m.name, STR_LEN);
    choose_category(m.category, STR_LEN);
    m.freq = read_int("Times per day (1-6)  : ", 1, MAX_DOSES);
    for (d = 0; d < m.freq; d++) {
        sprintf(prompt, "Reminder time #%d (HH:MM): ", d + 1);
        read_time(prompt, m.times[d]);
    }

    meds[count++] = m;
    save_data();
    printf("Medicine added successfully!\n");
}

static void view_all(void) {
    int i, d;
    if (count == 0) { printf("\nNo medicines added yet.\n"); return; }
    printf("\n--- All Medicines ---\n");
    for (i = 0; i < count; i++) {
        printf("%2d. %s | %s | %s (%s) | %d/day | ",
               i + 1, meds[i].person, meds[i].condition,
               meds[i].name, meds[i].category, meds[i].freq);
        for (d = 0; d < meds[i].freq; d++)
            printf("%s%s", meds[i].times[d], d < meds[i].freq - 1 ? ", " : "\n");
    }
}

static void view_by_condition(void) {
    char cond[STR_LEN];
    int i, d, found = 0;
    if (count == 0) { printf("\nNo medicines added yet.\n"); return; }

    read_line("\nEnter health condition (e.g. Thyroid): ", cond, STR_LEN);
    printf("\n--- Medicines for %s ---\n", cond);
    for (i = 0; i < count; i++) {
        if (!equals_ignore_case(meds[i].condition, cond)) continue;
        found++;
        printf("%d. %s: %s (%s), %d/day at ",
               found, meds[i].person, meds[i].name, meds[i].category, meds[i].freq);
        for (d = 0; d < meds[i].freq; d++)
            printf("%s%s", meds[i].times[d], d < meds[i].freq - 1 ? ", " : "\n");
    }
    if (!found) printf("No medicines found for this condition.\n");
}

static void todays_schedule(void) {
    Slot slots[MAX_MEDS * MAX_DOSES];
    int n, i, taken = 0;
    if (count == 0) { printf("\nNo medicines added yet.\n"); return; }

    n = build_schedule(slots);
    printf("\n=== Today's Schedule (current time %02d:%02d) ===",
           now_minutes() / 60, now_minutes() % 60);
    print_schedule(slots, n, 0);

    for (i = 0; i < n; i++) taken += meds[slots[i].med].taken[slots[i].dose];
    printf("\nProgress: %d of %d doses taken today.\n", taken, n);
}

static void show_reminders(void) {
    Slot slots[MAX_MEDS * MAX_DOSES];
    int n, i, now = now_minutes(), any = 0;
    n = build_schedule(slots);

    for (i = 0; i < n; i++) {
        Medicine *m = &meds[slots[i].med];
        if (m->taken[slots[i].dose] || now < slots[i].minutes) continue;
        if (!any) { printf("\n*** REMINDER: Pending medicines ***\n"); any = 1; }
        printf("  >> %s: take %s (%s) - scheduled %s ",
               m->person, m->name, m->category, m->times[slots[i].dose]);
        print_status(m, slots[i].dose, now);
        printf("\n");
    }
    if (!any && n > 0) printf("\nNo pending medicines right now. \n");
}

static void mark_taken(void) {
    Slot slots[MAX_MEDS * MAX_DOSES];
    int n, choice;
    if (count == 0) { printf("\nNo medicines added yet.\n"); return; }

    n = build_schedule(slots);
    print_schedule(slots, n, 1);
    choice = read_int("\nEnter number to mark as taken (0 to cancel): ", 0, n);
    if (choice == 0) return;

    {
        Medicine *m = &meds[slots[choice - 1].med];
        int d = slots[choice - 1].dose;
        if (m->taken[d]) {
            printf("That dose is already marked as taken.\n");
        } else {
            m->taken[d] = 1;
            save_data();
            printf("Marked: %s took %s (%s). Well done!\n", m->person, m->name, m->times[d]);
        }
    }
}

static void delete_medicine(void) {
    int choice, i;
    if (count == 0) { printf("\nNo medicines added yet.\n"); return; }

    view_all();
    choice = read_int("\nEnter number to delete (0 to cancel): ", 0, count);
    if (choice == 0) return;

    for (i = choice - 1; i < count - 1; i++) meds[i] = meds[i + 1];
    count--;
    save_data();
    printf("Medicine deleted.\n");
}

/* ---------- main ---------- */

static void print_menu(void) {
    printf("\n=========================================\n");
    printf("   MEDICINE REMINDER & MANAGEMENT SYSTEM\n");
    printf("=========================================\n");
    printf(" 1. Add medicine profile\n");
    printf(" 2. View all medicines\n");
    printf(" 3. View medicines by health condition\n");
    printf(" 4. Today's schedule\n");
    printf(" 5. Check reminders (what to take now)\n");
    printf(" 6. Mark medicine as taken\n");
    printf(" 7. Delete a medicine\n");
    printf(" 0. Exit\n");
}

int main(void) {
    int choice;

    load_data();
    if (count > 0) show_reminders();   /* remind right at startup */

    for (;;) {
        print_menu();
        choice = read_int("Choose an option: ", 0, 7);
        switch (choice) {
            case 1: add_medicine();       break;
            case 2: view_all();           break;
            case 3: view_by_condition();  break;
            case 4: todays_schedule();    break;
            case 5: show_reminders();     break;
            case 6: mark_taken();         break;
            case 7: delete_medicine();    break;
            case 0:
                save_data();
                printf("Stay healthy! Goodbye.\n");
                return 0;
        }
    }
}