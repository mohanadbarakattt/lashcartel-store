export function recommend(answers) {
  if (!Array.isArray(answers) || answers.length !== 5) throw new Error('Five answers are required.');
  const [, look, experience, priority, application] = answers;
  if (application === 'Pre-glued lashes for easy application') return 'Pretty Ambition';
  if (application === 'I’m not sure, help me choose!' &&
      (experience === 'Complete beginner' || priority === 'Quick and easy application')) return 'Pretty Ambition';
  if (look === 'Full and fluffy' || look === 'Bold and dramatic' ||
      (look === 'I’m not sure!' && priority === 'Maximum volume and glamour')) return 'DIY Cluster Lash Kit — Volume';
  return 'DIY Cluster Lash Kit — Natural';
}
